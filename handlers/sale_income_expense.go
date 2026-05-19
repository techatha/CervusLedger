package handlers

import (
	"database/sql"
	"fmt"
	"time"

	"CervusLedger/db"
	"CervusLedger/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
)

// ─── List ──────────────────────────────────────────────────────────────────

func (h *SaleHandler) ListIncomeExpense(db *sql.DB, f models.IncomeExpenseFilter) ([]models.IncomeExpense, error) {
	query := `
		SELECT id, type, category, amount, notes, source, date, created_at
		FROM income_expense
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
		query += ` AND date >= ?`
		args = append(args, f.StartDate)
	}
	if f.EndDate != "" {
		query += ` AND date <= ?`
		args = append(args, f.EndDate)
	}
	query += ` ORDER BY date DESC, id DESC`

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list income_expense: %w", err)
	}
	defer rows.Close()

	var list []models.IncomeExpense
	for rows.Next() {
		var e models.IncomeExpense
		if err := rows.Scan(
			&e.ID, &e.Type, &e.Category, &e.Amount,
			&e.Notes, &e.Source, &e.Date, &e.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan income_expense: %w", err)
		}
		list = append(list, e)
	}
	return list, nil
}

// ─── Create ────────────────────────────────────────────────────────────────

func (h *SaleHandler) CreateIncomeExpense(db *sql.DB, input models.IncomeExpenseInput) (models.IncomeExpense, error) {
	res, err := db.Exec(`
		INSERT INTO income_expense (type, category, amount, notes, source, date)
		VALUES (?, ?, ?, ?, 'manual', ?)
	`, input.Type, input.Category, input.Amount, input.Notes, input.Date)
	if err != nil {
		return models.IncomeExpense{}, fmt.Errorf("create income_expense: %w", err)
	}
	id, _ := res.LastInsertId()

	var e models.IncomeExpense
	db.QueryRow(`
		SELECT id, type, category, amount, notes, source, date, created_at
		FROM income_expense WHERE id = ?
	`, id).Scan(
		&e.ID, &e.Type, &e.Category, &e.Amount,
		&e.Notes, &e.Source, &e.Date, &e.CreatedAt,
	)
	return e, nil
}

// ─── Delete ────────────────────────────────────────────────────────────────

func (h *SaleHandler) DeleteIncomeExpense(db *sql.DB, id int) error {
	res, err := db.Exec(`DELETE FROM income_expense WHERE id = ? AND source = 'manual'`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("ลบได้เฉพาะรายการที่บันทึกเอง (รายการอัตโนมัติไม่สามารถลบได้)")
	}
	return nil
}

// ─── Summary ───────────────────────────────────────────────────────────────

func (h *SaleHandler) GetIncomeExpenseSummary(db *sql.DB, startDate, endDate string) (models.IncomeExpenseSummary, error) {
	s := models.IncomeExpenseSummary{StartDate: startDate, EndDate: endDate}

	query := `
		SELECT
			COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)
		FROM income_expense
		WHERE 1=1
	`
	args := []interface{}{}
	if startDate != "" {
		query += ` AND date >= ?`
		args = append(args, startDate)
	}
	if endDate != "" {
		query += ` AND date <= ?`
		args = append(args, endDate)
	}

	if err := db.QueryRow(query, args...).Scan(&s.TotalIncome, &s.TotalExpense); err != nil {
		return s, fmt.Errorf("summary query: %w", err)
	}
	s.Net = s.TotalIncome - s.TotalExpense
	return s, nil
}

// ─── Export ────────────────────────────────────────────────────────────────
func (h *SaleHandler) ExportIncomeExpense(startDate string, endDate string) error {
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

// ExportToXlsx writes income/expense data to an xlsx file at filePath.
func (h *SaleHandler) ExportToXlsx(startDate, endDate, filePath string) error {
	rows, err := db.DB.Query(`
		SELECT id, type, category, amount, notes, source, date
		FROM income_expense
		WHERE date >= ? AND date <= ?
		ORDER BY date ASC, id ASC
	`, startDate, endDate)
	if err != nil {
		return fmt.Errorf("query for export: %w", err)
	}
	defer rows.Close()

	var entries []models.IncomeExpense
	for rows.Next() {
		var e models.IncomeExpense
		rows.Scan(&e.ID, &e.Type, &e.Category, &e.Amount, &e.Notes, &e.Source, &e.Date)
		entries = append(entries, e)
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "รายรับ-รายจ่าย"
	f.SetSheetName("Sheet1", sheet)

	// ── Styles ──
	bold, _   := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 11}})
	title, _  := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14}})
	header, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"3A3020"}},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	incomeStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Color: "3D9A68"},
		NumFmt: 4, // #,##0.00
	})
	expenseStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Color: "C04848"},
		NumFmt: 4,
	})
	numStyle, _ := f.NewStyle(&excelize.Style{NumFmt: 4})
	_ = bold

	// ── Title rows ──
	f.SetCellValue(sheet, "A1", "รายงานรายรับ-รายจ่าย")
	f.SetCellStyle(sheet, "A1", "A1", title)
	f.MergeCell(sheet, "A1", "G1")

	beStart, beEnd := h.ceDateToBE(startDate), h.ceDateToBE(endDate)
	f.SetCellValue(sheet, "A2", fmt.Sprintf("ช่วงวันที่: %s ถึง %s", beStart, beEnd))
	f.MergeCell(sheet, "A2", "G2")

	generated := time.Now().Format("พิมพ์เมื่อ 02/01/2006 15:04")
	f.SetCellValue(sheet, "A3", generated)
	f.MergeCell(sheet, "A3", "G3")

	// ── Headers row 5 ──
	headers := []string{"ลำดับ", "วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน (บาท)", "แหล่งที่มา", "หมายเหตุ"}
	for i, h := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheet, fmt.Sprintf("%s5", col), h)
		f.SetCellStyle(sheet, fmt.Sprintf("%s5", col), fmt.Sprintf("%s5", col), header)
	}

	// ── Data rows ──
	var totalIncome, totalExpense float64
	for i, e := range entries {
		r := i + 6
		typeLabel := "รายรับ"
		if e.Type == "expense" {
			typeLabel = "รายจ่าย"
		}
		sourceLabel := "บันทึกเอง"
		if e.Source == "auto" {
			sourceLabel = "อัตโนมัติ"
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", r), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", r), h.ceDateToBE(e.Date))
		f.SetCellValue(sheet, fmt.Sprintf("C%d", r), typeLabel)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", r), e.Category)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", r), e.Amount)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", r), sourceLabel)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", r), e.Notes)

		if e.Type == "income" {
			f.SetCellStyle(sheet, fmt.Sprintf("E%d", r), fmt.Sprintf("E%d", r), incomeStyle)
			totalIncome += e.Amount
		} else {
			f.SetCellStyle(sheet, fmt.Sprintf("E%d", r), fmt.Sprintf("E%d", r), expenseStyle)
			totalExpense += e.Amount
		}
	}

	// ── Summary rows ──
	lastData := len(entries) + 6
	f.SetCellValue(sheet, fmt.Sprintf("D%d", lastData), "รวมรายรับ")
	f.SetCellValue(sheet, fmt.Sprintf("E%d", lastData), totalIncome)
	f.SetCellStyle(sheet, fmt.Sprintf("E%d", lastData), fmt.Sprintf("E%d", lastData), incomeStyle)

	f.SetCellValue(sheet, fmt.Sprintf("D%d", lastData+1), "รวมรายจ่าย")
	f.SetCellValue(sheet, fmt.Sprintf("E%d", lastData+1), totalExpense)
	f.SetCellStyle(sheet, fmt.Sprintf("E%d", lastData+1), fmt.Sprintf("E%d", lastData+1), expenseStyle)

	f.SetCellValue(sheet, fmt.Sprintf("D%d", lastData+2), "คงเหลือสุทธิ")
	f.SetCellValue(sheet, fmt.Sprintf("E%d", lastData+2), totalIncome-totalExpense)
	f.SetCellStyle(sheet, fmt.Sprintf("E%d", lastData+2), fmt.Sprintf("E%d", lastData+2), numStyle)

	// ── Column widths ──
	f.SetColWidth(sheet, "A", "A", 8)
	f.SetColWidth(sheet, "B", "B", 16)
	f.SetColWidth(sheet, "C", "C", 12)
	f.SetColWidth(sheet, "D", "D", 20)
	f.SetColWidth(sheet, "E", "E", 18)
	f.SetColWidth(sheet, "F", "F", 14)
	f.SetColWidth(sheet, "G", "G", 30)

	return f.SaveAs(filePath)
}


// ceDateToBE converts YYYY-MM-DD (CE) → DD/MM/BE display string.
func (h *SaleHandler) ceDateToBE(s string) string {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return s
	}
	return fmt.Sprintf("%02d/%02d/%d", t.Day(), int(t.Month()), t.Year()+543)
}
