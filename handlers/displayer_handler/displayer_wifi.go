package displayer_handler

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"CervusLedger/db"

	"go.bug.st/serial"
)

func (h *DisplayerHandler) ListSerialPorts() ([]string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return nil, fmt.Errorf("list serial ports: %w", err)
	}
	return ports, nil
}

func (h *DisplayerHandler) CheckPhysicalConnection() (string, error) {
	return h.FindESP32Port()
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

// FindESP32Port scans ports for the ESP32 connection
// FindESP32Port scans ports for the ESP32 connection
func (h *DisplayerHandler) FindESP32Port() (string, error) {
    ports, err := serial.GetPortsList()
    if err != nil {
        return "", err
    }

    fmt.Printf("\n[Serial Debug] 🔌 Raw ports detected by OS: %v\n", ports)

    // 1. Clean up expired blacklisted ports
    h.blacklistMutex.Lock()
    now := time.Now()
    for k, v := range h.portBlacklist {
        if now.After(v) {
            delete(h.portBlacklist, k)
        }
    }
    h.blacklistMutex.Unlock()

    for _, portName := range ports {
        // Ignore common non-ESP32 ports
        if strings.Contains(portName, "Bluetooth") || strings.Contains(portName, "Incoming") {
            continue
        }

        // 2. Check Blacklist
        h.blacklistMutex.Lock()
        blacklistedTime, isBlacklisted := h.portBlacklist[portName]
        h.blacklistMutex.Unlock()

        if isBlacklisted && now.Before(blacklistedTime) {
            timeLeft := time.Until(blacklistedTime).Round(time.Second)
            fmt.Printf("[Serial Debug] ⏭️  Skipping %s (on blacklist for %v more)\n", portName, timeLeft)
            continue // Skip this port for now, it recently failed
        }

        // 3. Test the port
        fmt.Printf("[Serial Debug] 🔍 Testing port: %s\n", portName)
        _, err := h.testPortForESP32WithTimeout(portName, 5*time.Second) // Reduced timeout for snappier UI
        if err == nil {
            fmt.Printf("[Serial Debug] ✅ ESP32 found on port: %s\n", portName)
            return portName, nil
        } else {
            // 4. Blacklist failed ports for 30 seconds
            h.blacklistMutex.Lock()
            h.portBlacklist[portName] = time.Now().Add(30 * time.Second)
            h.blacklistMutex.Unlock()
            fmt.Printf("[Serial Debug] 🚫 Failed to connect to %s (%v). Adding to blacklist for 30s.\n", portName, err)
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
