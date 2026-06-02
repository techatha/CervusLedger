package handlers

import (
	"CervusLedger/db"
	"CervusLedger/models"
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"
)

// ExportToXlsx writes income/expense data to an xlsx file at filePath.
func (h *IncomeExpenseHandler) ExportToXlsx(startDate, endDate, filePath string) error {
	rows, err := db.DB.Query(`
		SELECT id, type, category, amount, notes, source, date
		FROM income_expenses
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

	beStart, beEnd := h.CeDateToBE(startDate), h.CeDateToBE(endDate)
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
		f.SetCellValue(sheet, fmt.Sprintf("B%d", r), h.CeDateToBE(e.Date))
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
