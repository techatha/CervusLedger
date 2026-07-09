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
		SELECT id, type, category, amount, notes, source, is_bank_transfer, date, created_at
		FROM income_expenses
		WHERE 1=1
	`
	args := []interface{}{}

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
		WHERE 1=1
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
		FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL)
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
		FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL)
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
			FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL)
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
				FROM income_expenses WHERE date(date) = ? AND (is_bank_transfer = 0 OR is_bank_transfer IS NULL)
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
