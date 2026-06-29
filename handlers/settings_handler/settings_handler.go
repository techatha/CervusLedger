package settings_handler

import (
	"CervusLedger/db"
	"context"
	"strconv"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type SettingsHandler struct {
	ctx context.Context
}

func NewSettingsHandler() *SettingsHandler {
	return &SettingsHandler{}
}

func (h *SettingsHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *SettingsHandler) PrintWindow() {
	runtime.WindowPrint(h.ctx)
}

// AllSettings returns every key-value pair from the settings table.
func (h *SettingsHandler) GetAllSettings() (map[string]string, error) {
	rows, err := db.DB.Query(`SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		m[k] = v
	}
	return m, nil
}

// SaveAllSettings upserts a map of key→value pairs.
func (h *SettingsHandler) SaveAllSettings(settings map[string]string) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for k, v := range settings {
		_, err := tx.Exec(
			`INSERT INTO settings(key,value) VALUES(?,?)
			 ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
			k, v,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// Typed helpers used by other handlers
func (h *SettingsHandler) GetSettingFloat(key string, fallback float64) float64 {
	var v string
	if err := db.DB.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v); err != nil {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return f
}

func (h *SettingsHandler) GetSettingString(key string, fallback string) string {
	var v string
	if err := db.DB.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v); err != nil {
		return fallback
	}
	return v
}

func (h *SettingsHandler) GetBuyingDifference() int {
	var v string
	if err := db.DB.QueryRow(`SELECT value FROM settings WHERE key=?`, "buying_difference").Scan(&v); err != nil {
		return 0
	}
	val, err := strconv.Atoi(v)
	if err != nil {
		return 0
	}
	return val
}

// SetLastTicketNumber updates the last_ticket_number setting in the database.
func (h *SettingsHandler) SetLastTicketNumber(n int) error {
	_, err := db.DB.Exec(`
		INSERT INTO settings(key,value) VALUES('last_ticket_number',?)
		ON CONFLICT(key) DO UPDATE SET value=excluded.value
	`, strconv.Itoa(n))
	return err
}
