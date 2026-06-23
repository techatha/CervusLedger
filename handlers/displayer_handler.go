package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"CervusLedger/db"
	"go.bug.st/serial"
)

const (
	defaultBaudRate   = 115200
	provisionTimeout  = 20 * time.Second
	serialReadTimeout = 1 * time.Second
)

type DisplayerHandler struct {
	ctx context.Context
}

func NewDisplayerHandler() *DisplayerHandler {
	return &DisplayerHandler{}
}

func (h *DisplayerHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

type serialCommand struct {
	Cmd      string `json:"cmd"`
	SSID     string `json:"ssid,omitempty"`
	Password string `json:"password,omitempty"`
}

type SerialResponse struct {
	Status  string `json:"status"`
	IP      string `json:"ip,omitempty"`
	Message string `json:"message,omitempty"`
}

func (h *DisplayerHandler) ListSerialPorts() ([]string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return nil, fmt.Errorf("list serial ports: %w", err)
	}
	return ports, nil
}

func (h *DisplayerHandler) SaveWiFiCredentials(portName, ssid, password string) (string, error) {
	ip, err := h.ProvisionWiFi(portName, ssid, password)
	if err != nil {
		return "", err
	}

	_, _ = db.DB.Exec(`INSERT INTO settings(key, value) VALUES('qrcodedisplayer_ip', ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`, ip)

	return ip, nil
}

func (h *DisplayerHandler) SaveWiFiCredentialsAuto(ssid, password string) (string, error) {
	ip, err := h.ProvisionWiFiAuto(ssid, password)
	if err != nil {
		return "", err
	}

	_, _ = db.DB.Exec(`INSERT INTO settings(key, value) VALUES('qrcodedisplayer_ip', ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`, ip)

	return ip, nil
}

func (h *DisplayerHandler) GetWiFiDisplayerIP() (string, error) {
	var ip string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'qrcodedisplayer_ip'`).Scan(&ip)
	if err != nil {
		return "", nil
	}
	return ip, nil
}

func (h *DisplayerHandler) TestWiFiDisplayerConnection(ip string) (bool, error) {
	if ip == "" {
		return false, fmt.Errorf("IP address is empty")
	}
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://%s/", ip))
	if err != nil {
		resp, err = client.Get(fmt.Sprintf("http://%s/qr", ip))
		if err != nil {
			return false, fmt.Errorf("device is unreachable: %w", err)
		}
	}
	defer resp.Body.Close()
	return true, nil
}

func (h *DisplayerHandler) SendQRToDisplay(base64PNG string) error {
	var ip string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'qrcodedisplayer_ip'`).Scan(&ip)
	if err != nil || ip == "" {
		return fmt.Errorf("หน้าจอแสดงผล QR ยังไม่ได้ตั้งค่า WiFi หรือไม่พบ IP")
	}

	pngBytes, err := DecodeBase64PNG(base64PNG)
	if err != nil {
		return fmt.Errorf("decode base64 png: %w", err)
	}

	bmp, err := QRToBitmap(pngBytes)
	if err != nil {
		return fmt.Errorf("convert QR to bitmap: %w", err)
	}

	if err := h.PushQR(ip, bmp); err != nil {
		return fmt.Errorf("ส่ง QR ไปหน้าจอไม่ได้: %w", err)
	}

	return nil
}

// Internal provisioning methods
func (h *DisplayerHandler) ProvisionWiFi(portName, ssid, password string) (string, error) {
	mode := &serial.Mode{BaudRate: defaultBaudRate}
	port, err := serial.Open(portName, mode)
	if err != nil {
		return "", fmt.Errorf("open serial port %s: %w", portName, err)
	}
	defer port.Close()

	if err := port.SetReadTimeout(provisionTimeout); err != nil {
		return "", fmt.Errorf("set read timeout: %w", err)
	}

	time.Sleep(1500 * time.Millisecond)
	h.drainNonJSON(port)

	cmd := serialCommand{Cmd: "set_wifi", SSID: ssid, Password: password}
	if err := h.writeLine(port, cmd); err != nil {
		return "", fmt.Errorf("send wifi credentials: %w", err)
	}

	scanner := bufio.NewScanner(port)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var resp SerialResponse
		if err := json.Unmarshal([]byte(line), &resp); err != nil {
			continue
		}

		switch resp.Status {
		case "connecting":
			continue
		case "connected":
			if resp.IP == "" {
				return "", fmt.Errorf("ESP32 reported connected but sent no IP")
			}
			return resp.IP, nil
		case "error":
			return "", fmt.Errorf("ESP32 reported error: %s", resp.Message)
		}
	}

	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("serial read error: %w", err)
	}
	return "", fmt.Errorf("serial connection closed before connection status was received")
}

func (h *DisplayerHandler) ProvisionWiFiAuto(ssid, password string) (string, error) {
	portName, err := h.FindESP32Port()
	if err != nil {
		return "", err
	}
	return h.ProvisionWiFi(portName, ssid, password)
}

func (h *DisplayerHandler) FindESP32Port() (string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return "", err
	}

	for _, portName := range ports {
		if strings.Contains(portName, "Bluetooth") || strings.Contains(portName, "Incoming") {
			continue
		}

		_, err := h.testPortForESP32(portName)
		if err == nil {
			return portName, nil
		}
	}

	return "", fmt.Errorf("ไม่พบอุปกรณ์หน้าจอแสดงผล QR เชื่อมต่ออยู่")
}

func (h *DisplayerHandler) testPortForESP32(portName string) (string, error) {
	mode := &serial.Mode{BaudRate: defaultBaudRate}
	port, err := serial.Open(portName, mode)
	if err != nil {
		return "", err
	}
	defer port.Close()

	if err := port.SetReadTimeout(2 * time.Second); err != nil {
		return "", err
	}

	time.Sleep(1200 * time.Millisecond)
	h.drainNonJSON(port)

	if err := h.writeLine(port, serialCommand{Cmd: "get_status"}); err != nil {
		return "", err
	}

	scanner := bufio.NewScanner(port)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var resp SerialResponse
		if err := json.Unmarshal([]byte(line), &resp); err == nil {
			if resp.Status == "connected" || resp.Status == "not_configured" || resp.Status == "error" {
				return portName, nil
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("read error: %w", err)
	}
	return "", fmt.Errorf("no response")
}

func (h *DisplayerHandler) writeLine(port serial.Port, v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	data = append(data, '\n')
	_, err = port.Write(data)
	return err
}

func (h *DisplayerHandler) drainNonJSON(port serial.Port) {
	buf := make([]byte, 256)
	deadline := time.Now().Add(300 * time.Millisecond)
	for time.Now().Before(deadline) {
		n, err := port.Read(buf)
		if err != nil {
			return
		}
		if n == 0 {
			return
		}
	}
}

func (h *DisplayerHandler) PushQR(esp32IP string, bmp *Bitmap) error {
	body := make([]byte, 4+len(bmp.Bytes))
	binary.LittleEndian.PutUint16(body[0:2], uint16(bmp.Width))
	binary.LittleEndian.PutUint16(body[2:4], uint16(bmp.Height))
	copy(body[4:], bmp.Bytes)

	url := fmt.Sprintf("http://%s/qr", esp32IP)
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Post(url, "application/octet-stream", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("POST to ESP32 at %s: %w", esp32IP, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ESP32 returned HTTP %d", resp.StatusCode)
	}
	return nil
}
