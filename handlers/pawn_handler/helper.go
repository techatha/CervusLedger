package pawn_handler

import (
	"CervusLedger/db"
	"CervusLedger/models"
	"fmt"
	"strconv"
	"time"
)

// ─── helpers ──────────────────────────────────────────────────────────────

func thaiMonthName(m int) string {
	names := []string{
		"", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
		"ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
	}
	if m < 1 || m > 12 {
		return fmt.Sprintf("เดือน%d", m)
	}
	return names[m]
}

// TodayStr returns today's date as YYYY-MM-DD (CE).
func TodayStr() string {
	return time.Now().Format("2006-01-02")
}

// CalcInterest returns (rate%, amount) for a given principal using shop settings.
func CalcInterest(principal float64, s models.PawnSettings) (rate, amount float64) {
	if principal < s.Threshold {
		rate = s.LowRate
	} else {
		rate = s.HighRate
	}
	amount = principal * rate / 100
	if amount < s.MinInterest {
		amount = s.MinInterest
	}
	return
}

func nextTicketNumber() (int, error) {
	var raw string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'last_ticket_number'`).Scan(&raw)
	if err != nil {
		// key missing — start at 1
		_, _ = db.DB.Exec(`INSERT OR IGNORE INTO settings(key,value) VALUES('last_ticket_number','0')`)
		raw = "0"
	}
	n, _ := strconv.Atoi(raw)
	n++
	if n > 9999 {
		n = 1
	}
	_, err = db.DB.Exec(`UPDATE settings SET value = ? WHERE key = 'last_ticket_number'`, strconv.Itoa(n))
	return n, err
}
