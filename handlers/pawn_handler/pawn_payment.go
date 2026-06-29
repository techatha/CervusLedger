package pawn_handler

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

// RedeemPawn transitions pawn status to redeemed ('ถอน').
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
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Get pawn record details
	var customerID int
	var ticketNumber int
	var itemType string
	var weightGrams float64
	var principalAmount float64
	var description string
	err = tx.QueryRow(`
		SELECT customer_id, ticket_number, item_type, weight_grams, principal_amount, description
		FROM pawn_records WHERE id = ? AND status = 'active'
	`, id).Scan(&customerID, &ticketNumber, &itemType, &weightGrams, &principalAmount, &description)
	if err != nil {
		return fmt.Errorf("pawn record not found or not active: %w", err)
	}

	// 2. Update status to 'ขาด'
	_, err = tx.Exec(`UPDATE pawn_records SET status = 'ขาด' WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("update status to forfeit: %w", err)
	}

	// 3. Create notes
	pawnNotes := fmt.Sprintf("หลุดจำนำ ตั๋วเลขที่ #%04d", ticketNumber)
	if description != "" {
		pawnNotes += fmt.Sprintf(" (%s)", description)
	}

	todayStr := time.Now().Format("2006-01-02 15:04:05")

	// 4. Insert into purchased_gold
	_, err = tx.Exec(`
		INSERT INTO purchased_gold (customer_id, type, weight_grams, total_amount, notes, date, is_inventory, still_exists)
		VALUES (?, ?, ?, ?, ?, ?, 0, 1)
	`, customerID, itemType, weightGrams, principalAmount, pawnNotes, todayStr)
	if err != nil {
		return fmt.Errorf("insert purchased_gold from forfeit: %w", err)
	}

	return tx.Commit()
}

// UpdateTicketStatus marks a pawn ticket as lost or damaged.
func (h *PawnHandler) UpdateTicketStatus(id int, ticketStatus string) error {
	_, err := db.DB.Exec(`UPDATE pawn_records SET ticket_status = ? WHERE id = ?`, ticketStatus, id)
	return err
}
