package displayer_handler

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"CervusLedger/db"
)

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

func (h *DisplayerHandler) SendStaticQRToDisplay(promptpayID string, promptpayName string, bankName string, bankAccount string) error {
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

	if promptpayName == "" {
		_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'promptpay_name'`).Scan(&promptpayName)
		if promptpayName == "" {
			promptpayName = getEnvFromDotEnv("PROMPTPAY_NAME")
			if promptpayName == "" {
				promptpayName = getEnvFromDotEnv("VITE_DEFAULT_PROMPTPAY_NAME")
			}
		}
	}

	if bankName == "" {
		_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'bank_name'`).Scan(&bankName)
	}
	if bankAccount == "" {
		_ = db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'bank_account'`).Scan(&bankAccount)
	}

	// Download static QR from promptpay.io (no amount) directly from backend to avoid CORS restrictions
	url := fmt.Sprintf("https://promptpay.io/%s.png", promptpayID)
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

	if err := h.PushStaticQR(ip, bmp, promptpayName, bankName, bankAccount); err != nil {
		return fmt.Errorf("ส่ง static QR ไปหน้าจอไม่ได้: %w", err)
	}

	return nil
}

func (h *DisplayerHandler) PushStaticQR(esp32IP string, bmp *Bitmap, name string, bank string, account string) error {
	body := make([]byte, 4+len(bmp.Bytes))
	binary.LittleEndian.PutUint16(body[0:2], uint16(bmp.Width))
	binary.LittleEndian.PutUint16(body[2:4], uint16(bmp.Height))
	copy(body[4:], bmp.Bytes)

	hexString := hex.EncodeToString(body)

	// Construct JSON payload
	payload := struct {
		Name    string `json:"name"`
		Bank    string `json:"bank"`
		Account string `json:"account"`
		QR      string `json:"qr"`
	}{
		Name:    name,
		Bank:    bank,
		Account: account,
		QR:      hexString,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal displayer payload: %w", err)
	}

	url := fmt.Sprintf("http://%s/set_main_qr", esp32IP)
	client := &http.Client{Timeout: 5 * time.Second}

	// Send POST with text/plain content type
	resp, err := client.Post(url, "text/plain", bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("POST to ESP32 at %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ESP32 returned HTTP %d", resp.StatusCode)
	}
	return nil
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
