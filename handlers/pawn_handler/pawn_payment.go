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
	if paidDateVal == "" {
		paidDateVal = time.Now().Format("2006-01-02")
	}
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

// RecordPaymentsGrouped records multiple monthly interest payments and logs a single grouped income entry.
func (h *PawnHandler) RecordPaymentsGrouped(inputs []models.PawnPaymentInput, totalAmount float64, groupNotes string, isBankTransfer bool) error {
	if len(inputs) == 0 {
		return nil
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Loop through inputs and insert payment records
	for _, input := range inputs {
		// Guard: don't allow duplicate month+year for same pawn
		var exists int
		err := tx.QueryRow(`
			SELECT COUNT(*) FROM pawn_payments
			WHERE pawn_record_id = ? AND month = ? AND year = ?
		`, input.PawnRecordID, input.Month, input.Year).Scan(&exists)
		if err != nil {
			return fmt.Errorf("check duplicate: %w", err)
		}
		if exists > 0 {
			return fmt.Errorf("เดือน %s/%d จ่ายไปแล้ว", thaiMonthName(input.Month), input.Year+543)
		}

		paidDateVal := input.PaidDate
		if paidDateVal == "" {
			paidDateVal = time.Now().Format("2006-01-02")
		}
		if len(paidDateVal) == 10 {
			paidDateVal = paidDateVal + " " + time.Now().Format("15:04:05")
		}

		_, err = tx.Exec(`
			INSERT INTO pawn_payments (pawn_record_id, month, year, paid_date, notes)
			VALUES (?, ?, ?, ?, ?)
		`, input.PawnRecordID, input.Month, input.Year, paidDateVal, input.Notes)
		if err != nil {
			return fmt.Errorf("insert payment: %w", err)
		}
	}

	// 2. Auto-log single grouped income entry
	firstPaidDate := inputs[0].PaidDate
	if firstPaidDate == "" {
		firstPaidDate = time.Now().Format("2006-01-02")
	}
	if len(firstPaidDate) == 10 {
		firstPaidDate = firstPaidDate + " " + time.Now().Format("15:04:05")
	}

	isBankInt := 0
	if isBankTransfer {
		isBankInt = 1
	}
	_, err = tx.Exec(`
		INSERT INTO income_expenses (type, category, amount, notes, source, is_bank_transfer, date)
		VALUES ('income', 'ดอกเบี้ยจำนำ', ?, ?, 'auto', ?, ?)
	`, totalAmount, groupNotes, isBankInt, firstPaidDate)
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

func (h *PawnHandler) DeletePayment(paymentID int) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Fetch payment info
	var pawnRecordID int
	var paidDate string
	err = tx.QueryRow(`SELECT pawn_record_id, paid_date FROM pawn_payments WHERE id = ?`, paymentID).Scan(&pawnRecordID, &paidDate)
	if err != nil {
		return fmt.Errorf("payment not found: %w", err)
	}

	// 2. Fetch interest amount
	var amount float64
	err = tx.QueryRow(`SELECT interest_amount FROM pawn_records WHERE id = ?`, pawnRecordID).Scan(&amount)
	if err == nil {
		// Delete one matching auto-income entry
		tx.Exec(`
			DELETE FROM income_expenses 
			WHERE id = (
				SELECT id FROM income_expenses 
				WHERE source = 'auto' AND category = 'ดอกเบี้ยจำนำ' AND amount = ? AND date = ? 
				LIMIT 1
			)
		`, amount, paidDate)
	}

	// 3. Delete payment
	_, err = tx.Exec(`DELETE FROM pawn_payments WHERE id = ?`, paymentID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// RedeemPawn transitions pawn status to redeemed ('ถอน') and records the redemption date.
func (h *PawnHandler) RedeemPawn(id int, dateStr string) error {
	dateVal := dateStr
	if dateVal == "" {
		dateVal = time.Now().Format("2006-01-02")
	}
	if len(dateVal) == 10 {
		dateVal = dateVal + " " + time.Now().Format("15:04:05")
	}

	res, err := db.DB.Exec(`UPDATE pawn_records SET status = 'ถอน', redeemed_at = ? WHERE id = ? AND status = 'active'`, dateVal, id)
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

	todayStr := time.Now().Format("2006-01-02 15:04:05")

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

	// 2. Update status to 'ขาด' and record forfeit date
	_, err = tx.Exec(`UPDATE pawn_records SET status = 'ขาด', forfeited_at = ? WHERE id = ?`, todayStr, id)
	if err != nil {
		return fmt.Errorf("update status to forfeit: %w", err)
	}

	// 3. Create notes
	pawnNotes := fmt.Sprintf("หลุดจำนำ ตั๋วเลขที่ #%04d", ticketNumber)
	if description != "" {
		pawnNotes += fmt.Sprintf(" (%s)", description)
	}

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
