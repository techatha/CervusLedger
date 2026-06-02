package handlers

import (
	"fmt"
	"time"

	"CervusLedger/db"
	"CervusLedger/models"
)

// RecordPayment saves a monthly payment and auto-logs it as income.
func (h *PawnHandler) RecordPayment(input models.PawnPaymentInput) error {
	// Guard: don't allow duplicate month+year for same pawn
	var exists int
	err := db.DB.QueryRow(`
		SELECT COUNT(*) FROM pawn_payments
		WHERE pawn_record_id = ? AND month = ? AND year = ?
	`, input.PawnRecordID, input.Month, input.Year).Scan(&exists)
	if err != nil {
		return fmt.Errorf("check duplicate: %w", err)
	}
	if exists > 0 {
		return fmt.Errorf("เดือน %d/%d จ่ายไปแล้ว", input.Month, input.Year)
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	paidDateVal := input.PaidDate
	if len(paidDateVal) == 10 {
		paidDateVal = paidDateVal + " " + time.Now().Format("15:04:05")
	}

	// 1. Insert payment record
	_, err = tx.Exec(`
		INSERT INTO pawn_payments (pawn_record_id, month, year, paid_date, notes)
		VALUES (?, ?, ?, ?, ?)
	`, input.PawnRecordID, input.Month, input.Year, paidDateVal, input.Notes)
	if err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}

	// 2. Auto-log as income
	thaiMonth := thaiMonthName(input.Month)
	desc := fmt.Sprintf("ดอกเบี้ยจำนำ ตั๋ว %04d (%s) %s %d",
		input.TicketNumber, input.CustomerName, thaiMonth, input.Year+543)
	_, err = tx.Exec(`
		INSERT INTO income_expenses (type, category, amount, notes, source, date)
		VALUES ('income', 'ดอกเบี้ยจำนำ', ?, ?, 'auto', ?)
	`, input.InterestAmount, desc, paidDateVal)
	if err != nil {
		return fmt.Errorf("auto income: %w", err)
	}

	return tx.Commit()
}

// GetPawnPayments returns all payments for a pawn, ordered by year/month.
func (h *PawnHandler) GetPawnPayments(pawnRecordID int) ([]models.PawnPayment, error) {
	rows, err := db.DB.Query(`
		SELECT id, pawn_record_id, month, year, paid_date, notes
		FROM pawn_payments
		WHERE pawn_record_id = ?
		ORDER BY year ASC, month ASC
	`, pawnRecordID)
	if err != nil {
		return nil, fmt.Errorf("get payments: %w", err)
	}
	defer rows.Close()

	var list []models.PawnPayment
	for rows.Next() {
		var p models.PawnPayment
		if err := rows.Scan(&p.ID, &p.PawnRecordID, &p.Month, &p.Year, &p.PaidDate, &p.Notes); err != nil {
			return nil, fmt.Errorf("scan payment: %w", err)
		}
		list = append(list, p)
	}
	return list, nil
}

// DeletePayment removes a payment (and its auto-income entry by matching notes).
// Only for corrections — use with care.
func (h *PawnHandler) DeletePayment(paymentID int) error {
	_, err := db.DB.Exec(`DELETE FROM pawn_payments WHERE id = ?`, paymentID)
	return err
}

// ─── Status changes ────────────────────────────────────────────────────────

func (h *PawnHandler) RedeemPawn(id int) error {
	res, err := db.DB.Exec(`UPDATE pawn_records SET status = 'ถอน' WHERE id = ? AND status = 'active'`, id)
	if err != nil {
		return fmt.Errorf("redeem pawn: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("pawn %d not found or not active", id)
	}
	return nil
}

func (h *PawnHandler) ForfeitPawn(id int) error {
	res, err := db.DB.Exec(`UPDATE pawn_records SET status = 'ขาด' WHERE id = ? AND status = 'active'`, id)
	if err != nil {
		return fmt.Errorf("forfeit pawn: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("pawn %d not found or not active", id)
	}
	return nil
}

// UpdateTicketStatus marks a pawn ticket as lost or damaged.
func (h *PawnHandler) UpdateTicketStatus(id int, ticketStatus string) error {
	_, err := db.DB.Exec(`UPDATE pawn_records SET ticket_status = ? WHERE id = ?`, ticketStatus, id)
	return err
}

