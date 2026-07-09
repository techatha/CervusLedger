package income_expense_handler

import (
	"testing"
	"time"

	"CervusLedger/db"
	"CervusLedger/models"
	"fmt"

	"github.com/DATA-DOG/go-sqlmock"
)

// ─── Pure Function Test ──────────────────────────────────────────────────

func TestCeDateToBE(t *testing.T) {
	h := &IncomeExpenseHandler{}

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"Valid Date", "2023-05-30", "30/05/2566"},
		{"Valid Datetime", "2023-05-30 15:30:21", "30/05/2566"},
		{"Invalid Date", "invalid-date", "invalid-date"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := h.CeDateToBE(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

// ─── Database Read Test (List) ───────────────────────────────────────────

func TestListIncomeExpense(t *testing.T) {
	// 1. Initialize the mock DB
	dbMock, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock: %v", err)
	}
	defer dbMock.Close()
	db.DB = dbMock

	h := &IncomeExpenseHandler{}
	now := time.Now()

	// 2. Set up the expected rows we want the mock DB to return
	mockRows := sqlmock.NewRows([]string{"id", "type", "category", "amount", "notes", "source", "is_bank_transfer", "date", "created_at"}).
		AddRow(1, "income", "Sales", 1500.50, "Sold goods", "manual", 0, "2023-10-01", now).
		AddRow(2, "expense", "Rent", 500.00, "Shop rent", "auto", 0, "2023-10-02", now)

	// 3. Tell the mock what query to expect (using regex matching)
	// Because your query builds dynamically, we match the core SELECT statement
	mock.ExpectQuery(`SELECT id, type, category, amount, notes, source, is_bank_transfer, date, created_at FROM income_expenses`).
		WillReturnRows(mockRows)

	// 4. Call the actual function
	filter := models.IncomeExpenseFilter{} // Empty filter for this test
	results, err := h.ListIncomeExpense(filter)

	// 5. Assertions
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("expected 2 results, got %d", len(results))
	}
	if results[0].Amount != 1500.50 {
		t.Errorf("expected amount 1500.50, got %f", results[0].Amount)
	}

	// 6. Ensure all expectations were met
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %s", err)
	}
}

// ─── Database Write Test (Create) ────────────────────────────────────────

func TestCreateIncomeExpense(t *testing.T) {
	fmt.Println("TestCreateIncomeExpense")
	dbMock, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock: %v", err)
	}
	defer dbMock.Close()
	db.DB = dbMock

	h := &IncomeExpenseHandler{}
	input := models.IncomeExpenseInput{
		Type:     "income",
		Category: "Service",
		Amount:   1000.0,
		Notes:    "Consulting",
		Date:     "2023-10-05",
	}

	// 1. Expect the INSERT execution
	// It expects the args exactly as they are passed to db.Exec
	mock.ExpectExec(`INSERT INTO income_expenses`).
		WithArgs(input.Type, input.Category, input.Amount, input.Notes, 0, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1)) // LastInsertId = 1, RowsAffected = 1

	// 2. Expect the SELECT query that fetches the newly created record
	mockRows := sqlmock.NewRows([]string{"id", "type", "category", "amount", "notes", "source", "is_bank_transfer", "date", "created_at"}).
		AddRow(1, input.Type, input.Category, input.Amount, input.Notes, "manual", 0, input.Date, time.Now())

	mock.ExpectQuery(`SELECT id, type, category, amount, notes, source, is_bank_transfer, date, created_at FROM income_expenses WHERE id = \?`).
		WithArgs(1).
		WillReturnRows(mockRows)

	// 3. Call the function
	result, err := h.CreateIncomeExpense(input)

	// 4. Assertions
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID != 1 {
		t.Errorf("expected ID 1, got %d", result.ID)
	}
	if result.Category != "Service" {
		t.Errorf("expected Category 'Service', got %s", result.Category)
	}

	// 5. Check expectations
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %s", err)
	}
}

func TestGetIncomeExpenseSummary(t *testing.T) {
	dbMock, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock: %v", err)
	}
	defer dbMock.Close()
	db.DB = dbMock

	h := &IncomeExpenseHandler{}

	// ─── Scenario 1: User provides Start and End Dates ─────────────────────
	t.Run("With Date Filters", func(t *testing.T) {
		startDate := "2023-10-01"
		endDate := "2023-10-31"

		// 1. Mock the expected database return (e.g., 5000 income, 2000 expense)
		mockRow := sqlmock.NewRows([]string{"total_income", "total_expense"}).
			AddRow(5000.00, 2000.00)

		// 2. We expect the query to include the 'AND date(date) >= ? AND date(date) <= ?' clauses
		// Note: We use .* in the regex to account for the spaces and newlines in your raw SQL string
		mock.ExpectQuery(`SELECT(.*)FROM income_expenses WHERE 1=1 AND date\(date\) >= \? AND date\(date\) <= \?`).
			WithArgs(startDate, endDate).
			WillReturnRows(mockRow)

		// 3. Execute function
		result, err := h.GetIncomeExpenseSummary(startDate, endDate)

		// 4. Assertions
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.TotalIncome != 5000.00 {
			t.Errorf("expected income 5000, got %f", result.TotalIncome)
		}
		if result.TotalExpense != 2000.00 {
			t.Errorf("expected expense 2000, got %f", result.TotalExpense)
		}
		if result.Net != 3000.00 {
			t.Errorf("expected net 3000 (5000-2000), got %f", result.Net)
		}
	})

	// ─── Scenario 2: No dates provided & empty database (COALESCE hit) ─────
	t.Run("No Dates and Empty DB", func(t *testing.T) {
		// 1. Mock the expected database return when table is empty (COALESCE triggers 0, 0)
		mockRow := sqlmock.NewRows([]string{"total_income", "total_expense"}).
			AddRow(0.0, 0.0)

		// 2. We expect the base query ONLY. No date arguments should be passed.
		mock.ExpectQuery(`SELECT(.*)FROM income_expenses WHERE 1=1`).
			WillReturnRows(mockRow)

		// 3. Execute function with empty strings
		result, err := h.GetIncomeExpenseSummary("", "")

		// 4. Assertions
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.TotalIncome != 0.0 || result.TotalExpense != 0.0 {
			t.Errorf("expected 0 for both, got Income: %f, Expense: %f", result.TotalIncome, result.TotalExpense)
		}
		if result.Net != 0.0 {
			t.Errorf("expected net 0, got %f", result.Net)
		}
	})

	// ─── Final Check ────────────────────────────────────────────────────────
	// Make sure all queries we expected were actually fired
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %s", err)
	}
}

func TestGetDailyCash(t *testing.T) {
	dbMock, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock: %v", err)
	}
	defer dbMock.Close()
	db.DB = dbMock

	h := &IncomeExpenseHandler{}
	date := "2026-05-31"

	t.Run("Found in DB", func(t *testing.T) {
		mockRow := sqlmock.NewRows([]string{"date", "last_record_date", "amount_last_record", "expected_amount", "actual_amount", "notes", "created_at"}).
			AddRow(date, "2026-05-30", 5000.0, 6000.0, 5950.0, "Discrepancy test", "2026-05-31 10:00:00")

		mock.ExpectQuery(`SELECT date, last_record_date, amount_last_record, expected_amount, actual_amount, notes, created_at FROM daily_cash WHERE date = \?`).
			WithArgs(date).
			WillReturnRows(mockRow)

		res, err := h.GetDailyCash(date)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !res.IsSaved {
			t.Error("expected IsSaved to be true")
		}
		if res.ActualAmount != 5950.0 {
			t.Errorf("expected actual amount 5950, got %f", res.ActualAmount)
		}
		if res.AmountLastRecord != 5000.0 {
			t.Errorf("expected amount_last_record 5000, got %f", res.AmountLastRecord)
		}
		if res.LastRecordDate != "2026-05-30" {
			t.Errorf("expected last_record_date '2026-05-30', got %q", res.LastRecordDate)
		}
	})

	t.Run("Not Found in DB - Compute Draft", func(t *testing.T) {
		mock.ExpectQuery(`SELECT date, last_record_date, amount_last_record, expected_amount, actual_amount, notes, created_at FROM daily_cash WHERE date = \?`).
			WithArgs(date).
			WillReturnError(fmt.Errorf("sql: no rows in result set"))

		// Mock fetching last record
		mock.ExpectQuery(`SELECT date, actual_amount FROM daily_cash WHERE date < \? ORDER BY date DESC LIMIT 1`).
			WithArgs(date).
			WillReturnRows(sqlmock.NewRows([]string{"date", "actual_amount"}).AddRow("2026-05-30", 4000.0))

		// Mock fetching today's income/expense
		mock.ExpectQuery(`SELECT(.*)FROM income_expenses WHERE date\(date\) = \?`).
			WithArgs(date).
			WillReturnRows(sqlmock.NewRows([]string{"income", "expense"}).AddRow(1500.0, 300.0))

		res, err := h.GetDailyCash(date)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.IsSaved {
			t.Error("expected IsSaved to be false")
		}
		if res.AmountLastRecord != 4000.0 {
			t.Errorf("expected AmountLastRecord 4000, got %f", res.AmountLastRecord)
		}
		if res.LastRecordDate != "2026-05-30" {
			t.Errorf("expected LastRecordDate '2026-05-30', got %q", res.LastRecordDate)
		}
		if res.ExpectedAmount != 5200.0 { // 4000 + 1500 - 300
			t.Errorf("expected ExpectedAmount 5200, got %f", res.ExpectedAmount)
		}
		if res.ActualAmount != 5200.0 { // draft defaults to expected
			t.Errorf("expected ActualAmount to default to 5200, got %f", res.ActualAmount)
		}
	})

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %s", err)
	}
}

func TestSaveDailyCash(t *testing.T) {
	dbMock, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock: %v", err)
	}
	defer dbMock.Close()
	db.DB = dbMock

	h := &IncomeExpenseHandler{}
	input := models.DailyCashInput{
		Date:         "2026-05-31",
		ActualAmount: 5800.0,
		Notes:        "Manual save test",
	}

	mock.ExpectBegin()

	// 1. Get predecessor
	mock.ExpectQuery(`SELECT date, actual_amount FROM daily_cash WHERE date < \? ORDER BY date DESC LIMIT 1`).
		WithArgs(input.Date).
		WillReturnRows(sqlmock.NewRows([]string{"date", "actual_amount"}).AddRow("2026-05-30", 5000.0))

	// 2. Get total income/expense
	mock.ExpectQuery(`SELECT(.*)FROM income_expenses WHERE date\(date\) = \?`).
		WithArgs(input.Date).
		WillReturnRows(sqlmock.NewRows([]string{"income", "expense"}).AddRow(1000.0, 200.0)) // expected expected_amount = 5000 + 1000 - 200 = 5800

	// 3. Upsert
	mock.ExpectExec(`INSERT INTO daily_cash`).
		WithArgs(input.Date, "2026-05-30", 5000.0, 5800.0, input.ActualAmount, input.Notes).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// 4. Cascade updates forward: check for successor (mock no subsequent records)
	mock.ExpectQuery(`SELECT date FROM daily_cash WHERE date > \? ORDER BY date ASC LIMIT 1`).
		WithArgs(input.Date).
		WillReturnError(fmt.Errorf("sql: no rows in result set"))

	mock.ExpectCommit()

	// 5. GetDailyCash call after saving (inside SaveDailyCash return statement)
	mockRow := sqlmock.NewRows([]string{"date", "last_record_date", "amount_last_record", "expected_amount", "actual_amount", "notes", "created_at"}).
		AddRow(input.Date, "2026-05-30", 5000.0, 5800.0, input.ActualAmount, input.Notes, "2026-05-31 10:00:00")
	mock.ExpectQuery(`SELECT date, last_record_date, amount_last_record, expected_amount, actual_amount, notes, created_at FROM daily_cash WHERE date = \?`).
		WithArgs(input.Date).
		WillReturnRows(mockRow)

	res, err := h.SaveDailyCash(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.ActualAmount != 5800.0 {
		t.Errorf("expected saved actual amount 5800, got %f", res.ActualAmount)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %s", err)
	}
}
