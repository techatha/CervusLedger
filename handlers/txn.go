package handlers

import (
	"crypto/rand"
	"fmt"
	"time"
)

// GenerateTransactionID creates a unique transaction ID with the given prefix.
// Format: {prefix}_{unix_timestamp}_{4-char random hex}
// e.g., "pawn_pay_1722168000_a3f2"
func GenerateTransactionID(prefix string) string {
	b := make([]byte, 2)
	rand.Read(b)
	return fmt.Sprintf("%s_%d_%x", prefix, time.Now().UnixMilli(), b)
}
