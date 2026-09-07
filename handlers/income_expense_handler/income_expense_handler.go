package income_expense_handler

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"CervusLedger/db"
	"CervusLedger/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type IncomeExpenseHandler struct {
	ctx context.Context
}

func NewIncomeExpenseHandler() *IncomeExpenseHandler {
	return &IncomeExpenseHandler{}
}

func (h *IncomeExpenseHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

// ─── List ──────────────────────────────────────────────────────────────────

func (h *IncomeExpenseHandler) ListIncomeExpense(f models.IncomeExpenseFilter) ([]models.IncomeExpense, error) {
	query := `
		SELECT id, type, category, amount, notes, source, is_bank_transfer, date, created_at,
		       COALESCE(transaction_id, ''), COALESCE(status, 'active')
		FROM income_expenses
		WHERE 1=1
	`
	args := []interface{}{}

	// Status filter: default to active (including old rows with NULL status)
	if f.Status == "all" {
		// show everything
	} else if f.Status == "cancelled" {
		query += ` AND status = 'cancelled'`
	} else {
		// default: active only
		query += ` AND (status = 'active' OR status IS NULL)`
	}

	if f.Type != "" {
		query += ` AND type = ?`
		args = append(args, f.Type)
	}
	if f.Source != "" {
		query += ` AND source = ?`
		args = append(args, f.Source)
	}
	if f.StartDate != "" {
		query += ` AND date(date) >= ?`
		args = append(args, f.StartDate)
	}
	if f.EndDate != "" {
		query += ` AND date(date) <= ?`
		args = append(args, f.EndDate)
	}
	query += ` ORDER BY date DESC, id DESC`

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list income_expenses: %w", err)
	}
	defer rows.Close()

	var list []models.IncomeExpense
	for rows.Next() {
		var e models.IncomeExpense
		if err := rows.Scan(
			&e.ID, &e.Type, &e.Category, &e.Amount,
			&e.Notes, &e.Source, &e.IsBankTransfer, &e.Date, &e.CreatedAt,
			&e.TransactionID, &e.Status,
		); err != nil {
			return nil, fmt.Errorf("scan income_expenses: %w", err)
		}
		list = append(list, e)
	}
	return list, nil
}

// ─── Create ────────────────────────────────────────────────────────────────

func (h *IncomeExpenseHandler) CreateIncomeExpense(input models.IncomeExpenseInput) (models.IncomeExpense, error) {
	dateVal := input.Date
	if len(dateVal) == 10 {
		dateVal = dateVal + " " + time.Now().Format("15:04:05")
	}
	isBankInt := 0
	if input.IsBankTransfer {
		isBankInt = 1
	}
	res, err := db.DB.Exec(`
		INSERT INTO income_expenses (type, category, amount, notes, source, is_bank_transfer, date)
		VALUES (?, ?, ?, ?, 'manual', ?, ?)
	`, input.Type, input.Category, input.Amount, input.Notes, isBankInt, dateVal)
	if err != nil {
		return models.IncomeExpense{}, fmt.Errorf("create income_expenses: %w", err)
	}
	id, _ := res.LastInsertId()

	var e models.IncomeExpense
	db.DB.QueryRow(`
		SELECT id, type, category, amount, notes, source, is_bank_transfer, date, created_at
		FROM income_expenses WHERE id = ?
	`, id).Scan(
		&e.ID, &e.Type, &e.Category, &e.Amount,
		&e.Notes, &e.Source, &e.IsBankTransfer, &e.Date, &e.CreatedAt,
	)
	return e, nil
}

// ─── Update ────────────────────────────────────────────────────────────────

func (h *IncomeExpenseHandler) UpdateIncomeExpense(id int, input models.IncomeExpenseUpdateInput) error {
	isBankInt := 0
	if input.IsBankTransfer {
		isBankInt = 1
	}
	_, err := db.DB.Exec(`
		UPDATE income_expenses
		SET notes = ?, is_bank_transfer = ?, amount = ?, category = ?
		WHERE id = ?
	`, input.Notes, isBankInt, input.Amount, input.Category, id)
	return err
}

// ─── Delete ────────────────────────────────────────────────────────────────

func (h *IncomeExpenseHandler) DeleteIncomeExpense(id int) error {
	_, err := db.DB.Exec(`DELETE FROM income_expenses WHERE id = ?`, id)
	return err
}

// ─── Summary ───────────────────────────────────────────────────────────────

func (h *IncomeExpenseHandler) GetIncomeExpenseSummary(startDate, endDate string) (models.IncomeExpenseSummary, error) {
	s := models.IncomeExpenseSummary{StartDate: startDate, EndDate: endDate}

	query := `
		SELECT
			COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)
		FROM income_expenses
		WHERE (status = 'active' OR status IS NULL)
	`
	args := []interface{}{}
	if startDate != "" {
		query += ` AND date(date) >= ?`
		args = append(args, startDate)
	}
	if endDate != "" {
		query += ` AND date(date) <= ?`
		args = append(args, endDate)
	}

	if err := db.DB.QueryRow(query, args...).Scan(&s.TotalIncome, &s.TotalExpense); err != nil {
		return s, fmt.Errorf("summary query: %w", err)
	}
	s.Net = s.TotalIncome - s.TotalExpense
	return s, nil
}

// ─── Export ────────────────────────────────────────────────────────────────
func (h *IncomeExpenseHandler) ExportIncomeExpense(startDate string, endDate string) error {
	filePath, err := runtime.SaveFileDialog(h.ctx, runtime.SaveDialogOptions{
		Title:           "ส่งออกรายรับ-รายจ่าย",
		DefaultFilename: fmt.Sprintf("รายรับ-รายจ่าย_%s_%s.xlsx", startDate, endDate),
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return err
	}
	if filePath == "" {
		return nil // user cancelled
	}
	return h.ExportToXlsx(startDate, endDate, filePath)
}

// CeDateToBE converts YYYY-MM-DD (CE) → DD/MM/BE display string.
func (h *IncomeExpenseHandler) CeDateToBE(s string) string {
	datePart := s
	if len(s) > 10 {
		datePart = s[:10]
	}
	t, err := time.Parse("2006-01-02", datePart)
	if err != nil {
		return s
	}
	return fmt.Sprintf("%02d/%02d/%d", t.Day(), int(t.Month()), t.Year()+543)
}

// ─── Daily Cash ────────────────────────────────────────────────────────────

func (h *IncomeExpenseHandler) GetDailyCash(date string) (models.DailyCash, error) {
	var c models.DailyCash
	c.Date = date

	// 1. Try to fetch from daily_cash table
	var lastRecordDate sql.NullString
	err := db.DB.QueryRow(`
		SELECT date, last_record_date, amount_last_record, expected_amount, actual_amount, notes, created_at
		FROM daily_cash WHERE date = ?
	`, date).Scan(&c.Date, &lastRecordDate, &c.AmountLastRecord, &c.ExpectedAmount, &c.ActualAmount, &c.Notes, &c.CreatedAt)

	if err == nil {
		c.LastRecordDate = lastRecordDate.String
		c.IsSaved = true
		return c, nil
	}

	// 2. If not found, compute draft values using the latest predecessor record
	var prevDate string
	var amountLastRecord float64
	err = db.DB.QueryRow(`
		SELECT date, actual_amount FROM daily_cash
		WHERE date < ?
		ORDER BY date DESC LIMIT 1
	`, date).Scan(&prevDate, &amountLastRecord)
	if err != nil {
		c.LastRecordDate = "" // no predecessor
		c.AmountLastRecord = 0.0
	} else {
		c.LastRecordDate = prevDate
		c.AmountLastRecord = amountLastRecord
	}

	// Get sum of income and expense on 'date' from income_expenses
	var totalIncome, totalExpense float64
	err = db.DB.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)
		FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL) AND (status = 'active' OR status IS NULL)
	`, date).Scan(&totalIncome, &totalExpense)
	if err != nil {
		totalIncome, totalExpense = 0.0, 0.0
	}

	c.ExpectedAmount = c.AmountLastRecord + totalIncome - totalExpense
	c.ActualAmount = c.ExpectedAmount // default to expected amount
	c.IsSaved = false

	return c, nil
}

func (h *IncomeExpenseHandler) SaveDailyCash(input models.DailyCashInput) (models.DailyCash, error) {
	tx, err := db.DB.Begin()
	if err != nil {
		return models.DailyCash{}, err
	}
	defer tx.Rollback()

	// 1. Get predecessor for the date
	var predecessorDate string
	var amountLastRecord float64
	err = tx.QueryRow(`
		SELECT date, actual_amount FROM daily_cash
		WHERE date < ?
		ORDER BY date DESC LIMIT 1
	`, input.Date).Scan(&predecessorDate, &amountLastRecord)
	if err != nil {
		predecessorDate = ""
		amountLastRecord = 0.0
	}

	// 2. Get total income and expense on the date
	var totalIncome, totalExpense float64
	err = tx.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)
		FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL) AND (status = 'active' OR status IS NULL)
	`, input.Date).Scan(&totalIncome, &totalExpense)
	if err != nil {
		totalIncome, totalExpense = 0.0, 0.0
	}

	expectedAmount := amountLastRecord + totalIncome - totalExpense

	// 3. Insert or update the daily_cash record
	var lastRecordDateVal interface{}
	if predecessorDate != "" {
		lastRecordDateVal = predecessorDate
	} else {
		lastRecordDateVal = nil
	}

	_, err = tx.Exec(`
		INSERT INTO daily_cash (date, last_record_date, amount_last_record, expected_amount, actual_amount, notes)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(date) DO UPDATE SET
			last_record_date = excluded.last_record_date,
			amount_last_record = excluded.amount_last_record,
			expected_amount = excluded.expected_amount,
			actual_amount = excluded.actual_amount,
			notes = excluded.notes
	`, input.Date, lastRecordDateVal, amountLastRecord, expectedAmount, input.ActualAmount, input.Notes)
	if err != nil {
		return models.DailyCash{}, fmt.Errorf("upsert daily_cash: %w", err)
	}

	// 4. Update immediate successor's pointer if one exists
	var successorDate string
	err = tx.QueryRow(`
		SELECT date FROM daily_cash
		WHERE date > ?
		ORDER BY date ASC LIMIT 1
	`, input.Date).Scan(&successorDate)
	if err == nil {
		// Update successor's last_record_date to point to the newly inserted/updated input.Date
		// and its amount_last_record to input.ActualAmount
		var inc, exp float64
		err = tx.QueryRow(`
			SELECT
				COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)
			FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL) AND (status = 'active' OR status IS NULL)
		`, successorDate).Scan(&inc, &exp)
		if err != nil {
			inc, exp = 0.0, 0.0
		}

		expected := input.ActualAmount + inc - exp

		_, err = tx.Exec(`
			UPDATE daily_cash
			SET last_record_date = ?, amount_last_record = ?, expected_amount = ?
			WHERE date = ?
		`, input.Date, input.ActualAmount, expected, successorDate)
		if err != nil {
			return models.DailyCash{}, fmt.Errorf("update successor daily_cash: %w", err)
		}

		// Now cascade further downstream using the pointer-based linked list
		currentDate := successorDate
		var currentActual float64
		err = tx.QueryRow(`SELECT actual_amount FROM daily_cash WHERE date = ?`, currentDate).Scan(&currentActual)
		if err != nil {
			return models.DailyCash{}, fmt.Errorf("read successor actual amount: %w", err)
		}

		for {
			// Find the next node that points to currentDate
			var nextDate string
			var nextActual float64
			err = tx.QueryRow(`
				SELECT date, actual_amount FROM daily_cash
				WHERE last_record_date = ?
			`, currentDate).Scan(&nextDate, &nextActual)
			if err == sql.ErrNoRows {
				break
			} else if err != nil {
				return models.DailyCash{}, fmt.Errorf("find next node in chain: %w", err)
			}

			// Calculate expected amount for next node
			var nInc, nExp float64
			err = tx.QueryRow(`
				SELECT
					COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0),
					COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)
				FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL) AND (status = 'active' OR status IS NULL)
			`, nextDate).Scan(&nInc, &nExp)
			if err != nil {
				nInc, nExp = 0.0, 0.0
			}

			expectedNext := currentActual + nInc - nExp

			_, err = tx.Exec(`
				UPDATE daily_cash
				SET amount_last_record = ?, expected_amount = ?
				WHERE date = ?
			`, currentActual, expectedNext, nextDate)
			if err != nil {
				return models.DailyCash{}, fmt.Errorf("cascade update next node: %w", err)
			}

			currentDate = nextDate
			currentActual = nextActual
		}
	}

	if err := tx.Commit(); err != nil {
		return models.DailyCash{}, err
	}

	// Return the saved record
	return h.GetDailyCash(input.Date)
}

func (h *IncomeExpenseHandler) ListDailyCash(startDate, endDate string) ([]models.DailyCash, error) {
	rows, err := db.DB.Query(`
		SELECT date, last_record_date, amount_last_record, expected_amount, actual_amount, notes, created_at
		FROM daily_cash
		WHERE date >= ? AND date <= ?
		ORDER BY date ASC
	`, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("list daily_cash: %w", err)
	}
	defer rows.Close()

	var list []models.DailyCash
	for rows.Next() {
		var c models.DailyCash
		var lastRecordDate sql.NullString
		if err := rows.Scan(&c.Date, &lastRecordDate, &c.AmountLastRecord, &c.ExpectedAmount, &c.ActualAmount, &c.Notes, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan daily_cash: %w", err)
		}
		c.LastRecordDate = lastRecordDate.String
		c.IsSaved = true
		list = append(list, c)
	}
	return list, nil
}

// ─── Cancel Transaction ────────────────────────────────────────────────────

// GetCancelPreview returns a preview of what will happen if an income/expense entry is cancelled.
func (h *IncomeExpenseHandler) GetCancelPreview(id int) (models.CancelPreview, error) {
	preview := models.CancelPreview{EntryID: id}

	var txnID sql.NullString
	var status sql.NullString
	var category, source string
	err := db.DB.QueryRow(`
		SELECT category, source, COALESCE(transaction_id, ''), COALESCE(status, 'active')
		FROM income_expenses WHERE id = ?
	`, id).Scan(&category, &source, &txnID, &status)
	if err != nil {
		return preview, fmt.Errorf("entry not found: %w", err)
	}

	preview.Category = category

	if status.String == "cancelled" {
		preview.CanCancel = false
		preview.Reason = "รายการนี้ถูกยกเลิกไปแล้ว"
		return preview, nil
	}

	if !txnID.Valid || txnID.String == "" {
		preview.CanCancel = false
		preview.Reason = "รายการเก่าไม่สามารถยกเลิกได้ (ไม่มีรหัสอ้างอิง)"
		return preview, nil
	}

	preview.CanCancel = true
	tid := txnID.String

	switch category {
	case "ดอกเบี้ยจำนำ":
		// Find linked pawn payments
		rows, err := db.DB.Query(`
			SELECT pp.pawn_record_id, COALESCE(pr.ticket_number, 0), pp.month, pp.year
			FROM pawn_payments pp
			LEFT JOIN pawn_records pr ON pr.id = pp.pawn_record_id
			WHERE pp.transaction_id = ?
		`, tid)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var info models.PawnPaymentInfo
				rows.Scan(&info.PawnRecordID, &info.TicketNumber, &info.Month, &info.Year)
				preview.WillRevertPayments = append(preview.WillRevertPayments, info)
			}
		}

	case "ขายทอง", "รับซื้อทอง":
		// Check if there are linked stock logs
		var count int
		db.DB.QueryRow(`SELECT COUNT(*) FROM gold_stock_logs WHERE transaction_id = ?`, tid).Scan(&count)
		preview.WillRevertStock = count > 0

	case "ลดต้นจำนำ", "เพิ่มต้นจำนำ", "ไถ่ถอน":
		// Check if this is a principal change and find cascade effects
		var pcID int
		var pawnRecordID int
		err := db.DB.QueryRow(`
			SELECT id, pawn_record_id FROM principal_changes WHERE transaction_id = ?
		`, tid).Scan(&pcID, &pawnRecordID)
		if err == nil {
			preview.WillRevertPrincipal = true
			// Find newer changes that would also need to be reverted
			rows, err := db.DB.Query(`
				SELECT id, pawn_record_id, date, change_type, amount, new_principal, notes
				FROM principal_changes
				WHERE pawn_record_id = ? AND id > ?
				ORDER BY id ASC
			`, pawnRecordID, pcID)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var c models.PrincipalChange
					rows.Scan(&c.ID, &c.PawnRecordID, &c.Date, &c.ChangeType, &c.Amount, &c.NewPrincipal, &c.Notes)
					preview.CascadeChanges = append(preview.CascadeChanges, c)
				}
			}
		}

	case "รับจำนำ":
		preview.Notice = "ยกเลิกเฉพาะรายการรายรับ-รายจ่าย ตั๋วจำนำจะไม่ถูกลบ"
	}

	return preview, nil
}

// CancelIncomeExpense cancels an income/expense entry and reverts linked records.
func (h *IncomeExpenseHandler) CancelIncomeExpense(id int) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Fetch the entry
	var txnID sql.NullString
	var status sql.NullString
	var category string
	err = tx.QueryRow(`
		SELECT category, COALESCE(transaction_id, ''), COALESCE(status, 'active')
		FROM income_expenses WHERE id = ?
	`, id).Scan(&category, &txnID, &status)
	if err != nil {
		return fmt.Errorf("entry not found: %w", err)
	}

	if status.String == "cancelled" {
		return fmt.Errorf("รายการนี้ถูกยกเลิกไปแล้ว")
	}

	if !txnID.Valid || txnID.String == "" {
		return fmt.Errorf("รายการเก่าไม่สามารถยกเลิกได้ (ไม่มีรหัสอ้างอิง)")
	}

	tid := txnID.String

	// 2. Mark as cancelled
	_, err = tx.Exec(`UPDATE income_expenses SET status = 'cancelled' WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("cancel entry: %w", err)
	}

	// 3. Revert linked records based on category
	switch category {
	case "ดอกเบี้ยจำนำ":
		// Delete linked pawn payments
		_, err = tx.Exec(`DELETE FROM pawn_payments WHERE transaction_id = ?`, tid)
		if err != nil {
			return fmt.Errorf("revert pawn payments: %w", err)
		}

	case "ขายทอง", "รับซื้อทอง":
		// Add compensating stock log entries
		rows, err := tx.Query(`
			SELECT gold_item_id, amount FROM gold_stock_logs WHERE transaction_id = ?
		`, tid)
		if err != nil {
			return fmt.Errorf("query stock logs: %w", err)
		}

		type stockRevert struct {
			goldItemID int
			amount     int
		}
		var reverts []stockRevert
		for rows.Next() {
			var goldItemID, amount int
			rows.Scan(&goldItemID, &amount)
			reverts = append(reverts, stockRevert{goldItemID: goldItemID, amount: amount})
		}
		rows.Close()

		cancelTxnID := tid + "_cancel"
		for _, r := range reverts {
			// Find latest amount for this gold item
			latestAmount, err := db.GetLatestStockAmount(tx, r.goldItemID)
			if err != nil {
				latestAmount = 0
			}

			// Determine the compensation direction from the original log's context
			// For sells (category=ขายทอง): original decremented, so we add back
			// For buys (category=รับซื้อทอง): original incremented, so we subtract
			var compensation int
			if category == "ขายทอง" {
				compensation = latestAmount + 1 // Restore the sold item
			} else {
				compensation = latestAmount - 1 // Remove the bought item
			}

			_, err = tx.Exec(`
				INSERT INTO gold_stock_logs (gold_item_id, amount, transaction_id)
				VALUES (?, ?, ?)
			`, r.goldItemID, compensation, cancelTxnID)
			if err != nil {
				return fmt.Errorf("compensating stock log: %w", err)
			}
		}

	case "ลดต้นจำนำ", "เพิ่มต้นจำนำ", "ไถ่ถอน":
		// Revert principal changes with cascade
		var pcID int
		var pawnRecordID int
		err := tx.QueryRow(`
			SELECT id, pawn_record_id FROM principal_changes WHERE transaction_id = ?
		`, tid).Scan(&pcID, &pawnRecordID)
		if err == nil {
			// Cancel all income_expenses linked to this and all newer principal changes
			newerRows, err := tx.Query(`
				SELECT transaction_id FROM principal_changes
				WHERE pawn_record_id = ? AND id >= ?
				ORDER BY id ASC
			`, pawnRecordID, pcID)
			if err == nil {
				var newerTxnIDs []string
				for newerRows.Next() {
					var nTid sql.NullString
					newerRows.Scan(&nTid)
					if nTid.Valid && nTid.String != "" {
						newerTxnIDs = append(newerTxnIDs, nTid.String)
					}
				}
				newerRows.Close()

				// Cancel all linked income_expenses for cascaded changes
				for _, nTid := range newerTxnIDs {
					if nTid != tid { // Don't double-cancel the original
						tx.Exec(`UPDATE income_expenses SET status = 'cancelled' WHERE transaction_id = ? AND status = 'active'`, nTid)
					}
				}
			}

			// Delete all principal changes from this one onwards
			_, _ = tx.Exec(`DELETE FROM principal_changes WHERE pawn_record_id = ? AND id >= ?`, pawnRecordID, pcID)

			// Recalculate pawn's interest from the now-latest principal change (or original)
			var newPrincipal float64
			err = tx.QueryRow(`
				SELECT new_principal FROM principal_changes
				WHERE pawn_record_id = ?
				ORDER BY id DESC LIMIT 1
			`, pawnRecordID).Scan(&newPrincipal)
			if err != nil {
				// No more changes, revert to original principal
				tx.QueryRow(`SELECT principal_amount FROM pawn_records WHERE id = ?`, pawnRecordID).Scan(&newPrincipal)
			}

			// Get interest rate to recalculate interest amount
			var rate float64
			tx.QueryRow(`SELECT monthly_interest_rate FROM pawn_records WHERE id = ?`, pawnRecordID).Scan(&rate)
			newInterest := newPrincipal * rate / 100
			if newInterest < 0 {
				newInterest = 0
			}

			_, _ = tx.Exec(`
				UPDATE pawn_records SET interest_amount = ? WHERE id = ?
			`, newInterest, pawnRecordID)
		}
	}

	return tx.Commit()
}
