package displayer_handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"CervusLedger/db"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	defaultBaudRate   = 115200
	provisionTimeout  = 20 * time.Second
	serialReadTimeout = 1 * time.Second
)

type DisplayerHandler struct {
	ctx            context.Context
	portBlacklist  map[string]time.Time
	blacklistMutex sync.Mutex
}

func NewDisplayerHandler() *DisplayerHandler {
	return &DisplayerHandler{
		portBlacklist: make(map[string]time.Time),
	}
}

func (h *DisplayerHandler) Startup(ctx context.Context) {
	h.ctx = ctx
	go h.startLocalServer()
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

// startLocalServer listens for incoming requests from the ESP32 on the local network
func (h *DisplayerHandler) startLocalServer() {
	http.HandleFunc("/esp_disconnected", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			fmt.Println("\n[Go Backend] 🚨 Received factory reset webhook from ESP32!")

			// 1. Wipe the IP from the local database so the app knows it's disconnected
			_, _ = db.DB.Exec(`DELETE FROM settings WHERE key = 'qrcodedisplayer_ip'`)

			// 2. Fire an event to the Wails frontend UI to show a "Device Disconnected" alert
			if h.ctx != nil {
				runtime.EventsEmit(h.ctx, "esp32:disconnected", map[string]string{
					"status":  "reset",
					"message": "The display was reset to factory settings.",
				})
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Acknowledged"))
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	})

	fmt.Println("[Go Backend] Listening for ESP32 webhooks on port 8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("Error starting local HTTP server: %v\n", err)
	}
}

// RegisterWebhook tells the ESP32 where to send the goodbye packet
// Call this function whenever you pair/connect to your ESP32 IP
func (h *DisplayerHandler) RegisterWebhook(espIP string) error {
	// Dynamically grab this PC's local IP
	myLocalIP := getLocalIP()
	webhookTarget := fmt.Sprintf("http://%s:8080/esp_disconnected", myLocalIP)

	fmt.Printf("[Go Backend] Registering webhook target with ESP32: %s\n", webhookTarget)

	payload := map[string]string{"url": webhookTarget}
	jsonPayload, _ := json.Marshal(payload)

	espUrl := fmt.Sprintf("http://%s/set_webhook", espIP)

	// Send it as plain text to match your ESP32 server.arg("plain") logic
	resp, err := http.Post(espUrl, "text/plain", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to register webhook: %w", err)
	}
	defer resp.Body.Close()

	return nil
}
