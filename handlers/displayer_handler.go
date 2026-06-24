package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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

func (h *DisplayerHandler) SendQRToDisplay(promptpayID string, amount float64) error {
	var ip string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'qrcodedisplayer_ip'`).Scan(&ip)
	if err != nil || ip == "" {
		return fmt.Errorf("หน้าจอแสดงผล QR ยังไม่ได้ตั้งค่า WiFi หรือไม่พบ IP")
	}

	if promptpayID == "" {
		_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'promptpay_number'`).Scan(&promptpayID)
	}
	if promptpayID == "" {
		promptpayID = getEnvFromDotEnv("PROMPTPAY_NUMBER")
		if promptpayID == "" {
			promptpayID = getEnvFromDotEnv("VITE_DEFAULT_PROMPTPAY_NUMBER")
		}
	}
	if promptpayID == "" {
		return fmt.Errorf("ไม่พบหมายเลขพร้อมเพย์ กรุณาตั้งค่าในหน้าตั้งค่าหรือไฟล์ .env")
	}

	// Fetch store's PromptPay name from settings
	var promptpayName string
	_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'promptpay_name'`).Scan(&promptpayName)

	if promptpayName == "" {
		promptpayName = getEnvFromDotEnv("PROMPTPAY_NAME")
		if promptpayName == "" {
			promptpayName = getEnvFromDotEnv("VITE_DEFAULT_PROMPTPAY_NAME")
		}
	}

	// Download from promptpay.io directly from backend to avoid CORS restrictions
	url := fmt.Sprintf("https://promptpay.io/%s/%.2f.png", promptpayID, amount)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("ดาวน์โหลด QR Code จาก promptpay.io ล้มเหลว: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ดาวน์โหลด QR Code ล้มเหลว: http %d", resp.StatusCode)
	}

	var buf bytes.Buffer
	if _, err := buf.ReadFrom(resp.Body); err != nil {
		return fmt.Errorf("อ่านข้อมูลรูปภาพ QR ล้มเหลว: %w", err)
	}
	pngBytes := buf.Bytes()

	bmp, err := QRToBitmap(pngBytes)
	if err != nil {
		return fmt.Errorf("convert QR to bitmap: %w", err)
	}

	// Fetch bank details from settings
	var bankName, bankAccount string
	_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'bank_name'`).Scan(&bankName)
	_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'bank_account'`).Scan(&bankAccount)

	if err := h.PushQR(ip, bmp, amount, promptpayName, bankName, bankAccount); err != nil {
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

	fmt.Printf("Looking for ESP32 Display on %d ports....\n", len(ports))
	for _, portName := range ports {
		if strings.Contains(portName, "Bluetooth") || strings.Contains(portName, "Incoming") {
			continue
		}

		fmt.Printf("Testing port: %s\n", portName)
		_, err := h.testPortForESP32WithTimeout(portName, 4*time.Second)
		if err == nil {
			fmt.Printf("Found ESP32 Display on port: %s\n", portName)
			return portName, nil
		} else {
			fmt.Printf("Port %s test failed/timeout: %v\n", portName, err)
		}
	}

	return "", fmt.Errorf("ไม่พบอุปกรณ์หน้าจอแสดงผล QR เชื่อมต่ออยู่")
}

func (h *DisplayerHandler) testPortForESP32WithTimeout(portName string, timeout time.Duration) (string, error) {
	type result struct {
		port string
		err  error
	}
	ch := make(chan result, 1)
	go func() {
		p, err := h.testPortForESP32(portName)
		ch <- result{port: p, err: err}
	}()

	select {
	case res := <-ch:
		return res.port, res.err
	case <-time.After(timeout):
		return "", fmt.Errorf("timeout waiting for port response")
	}
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

func (h *DisplayerHandler) PushQR(esp32IP string, bmp *Bitmap, amount float64, name string, bank string, account string) error {
	body := make([]byte, 4+len(bmp.Bytes))
	binary.LittleEndian.PutUint16(body[0:2], uint16(bmp.Width))
	binary.LittleEndian.PutUint16(body[2:4], uint16(bmp.Height))
	copy(body[4:], bmp.Bytes)

	hexString := hex.EncodeToString(body)

	// Construct JSON payload
	payload := struct {
		QR      string  `json:"qr"`
		Amount  float64 `json:"amount"`
		Name    string  `json:"name"`
		Bank    string  `json:"bank"`
		Account string  `json:"account"`
	}{
		QR:      hexString,
		Amount:  amount,
		Name:    name,
		Bank:    bank,
		Account: account,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal displayer payload: %w", err)
	}

	url := fmt.Sprintf("http://%s/qr", esp32IP)
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Post(url, "application/json", bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("POST to ESP32 at %s: %w", esp32IP, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ESP32 returned HTTP %d", resp.StatusCode)
	}
	return nil
}

func (h *DisplayerHandler) SetShopName(shopName string) error {
	var ip string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'qrcodedisplayer_ip'`).Scan(&ip)
	if err != nil || ip == "" {
		return fmt.Errorf("หน้าจอแสดงผล QR ยังไม่ได้ตั้งค่า WiFi หรือไม่พบ IP")
	}

	if shopName == "" {
		_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'shop_name'`).Scan(&shopName)
	}

	payload := struct {
		ShopName string `json:"shop_name"`
	}{
		ShopName: shopName,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal set_shop_name payload: %w", err)
	}

	url := fmt.Sprintf("http://%s/set_shop_name", ip)
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Post(url, "application/json", bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("POST to ESP32 at %s: %w", ip, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ESP32 returned HTTP %d", resp.StatusCode)
	}
	return nil
}

func (h *DisplayerHandler) SendSuccessToDisplay() error {
	var ip string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'qrcodedisplayer_ip'`).Scan(&ip)
	if err != nil || ip == "" {
		return fmt.Errorf("หน้าจอแสดงผล QR ยังไม่ได้ตั้งค่า WiFi หรือไม่พบ IP")
	}

	url := fmt.Sprintf("http://%s/success", ip)
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Post(url, "application/json", bytes.NewReader([]byte("{}")))
	if err != nil {
		return fmt.Errorf("POST to ESP32 success endpoint at %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ESP32 success endpoint returned HTTP %d", resp.StatusCode)
	}
	return nil
}

func (h *DisplayerHandler) SendFailToDisplay() error {
	var ip string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'qrcodedisplayer_ip'`).Scan(&ip)
	if err != nil || ip == "" {
		return fmt.Errorf("หน้าจอแสดงผล QR ยังไม่ได้ตั้งค่า WiFi หรือไม่พบ IP")
	}

	url := fmt.Sprintf("http://%s/fail", ip)
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Post(url, "application/json", bytes.NewReader([]byte("{}")))
	if err != nil {
		return fmt.Errorf("POST to ESP32 fail endpoint at %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ESP32 fail endpoint returned HTTP %d", resp.StatusCode)
	}
	return nil
}

func getEnvFromDotEnv(key string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	if val := readEnvFromFile(".env", key); val != "" {
		return val
	}
	return readEnvFromFile("frontend/.env", key)
}

func readEnvFromFile(filePath string, key string) string {
	file, err := os.Open(filePath)
	if err != nil {
		return ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			if (strings.HasPrefix(v, "\"") && strings.HasSuffix(v, "\"")) || 
			   (strings.HasPrefix(v, "'") && strings.HasSuffix(v, "'")) {
				v = v[1 : len(v)-1]
			}
			if k == key {
				return v
			}
		}
	}
	return ""
}