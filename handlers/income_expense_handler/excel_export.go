package income_expense_handler

import (
	"CervusLedger/db"
	"CervusLedger/models"
	"database/sql"
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"
)

// ExportToXlsx writes income/expense + daily cash data to an xlsx file.
func (h *IncomeExpenseHandler) ExportToXlsx(startDate, endDate, filePath string) error {
	// ── Fetch income/expense entries ──
	rows, err := db.DB.Query(`
		SELECT id, type, category, amount, notes, source, is_bank_transfer, date
		FROM income_expenses
		WHERE date(date) >= ? AND date(date) <= ?
		ORDER BY date ASC, id ASC
	`, startDate, endDate)
	if err != nil {
		return fmt.Errorf("query for export: %w", err)
	}
	defer rows.Close()

	var entries []models.IncomeExpense
	for rows.Next() {
		var e models.IncomeExpense
		rows.Scan(&e.ID, &e.Type, &e.Category, &e.Amount, &e.Notes, &e.Source, &e.IsBankTransfer, &e.Date)
		entries = append(entries, e)
	}

	// ── Fetch daily cash records ──
	cashRows, err := db.DB.Query(`
		SELECT date, last_record_date, amount_last_record, expected_amount, actual_amount, notes, created_at
		FROM daily_cash
		WHERE date >= ? AND date <= ?
		ORDER BY date ASC
	`, startDate, endDate)
	if err != nil {
		return fmt.Errorf("query daily_cash for export: %w", err)
	}
	defer cashRows.Close()

	var cashEntries []models.DailyCash
	for cashRows.Next() {
		var c models.DailyCash
		var lastRecordDate sql.NullString
		if err := cashRows.Scan(&c.Date, &lastRecordDate, &c.AmountLastRecord, &c.ExpectedAmount, &c.ActualAmount, &c.Notes, &c.CreatedAt); err != nil {
			return fmt.Errorf("scan daily_cash for export: %w", err)
		}
		c.LastRecordDate = lastRecordDate.String
		cashEntries = append(cashEntries, c)
	}

	// ── Group income/expense by date ──
	type dayGroup struct {
		date    string
		entries []models.IncomeExpense
	}
	var groups []dayGroup
	groupMap := make(map[string]int) // date → index in groups
	for _, e := range entries {
		datePart := e.Date
		if len(datePart) > 10 {
			datePart = datePart[:10]
		}
		if idx, ok := groupMap[datePart]; ok {
			groups[idx].entries = append(groups[idx].entries, e)
		} else {
			groupMap[datePart] = len(groups)
			groups = append(groups, dayGroup{date: datePart, entries: []models.IncomeExpense{e}})
		}
	}

	f := excelize.NewFile()
	defer f.Close()

	// ── Styles ──
	title, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14}})
	subtitle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 11, Color: "555555"}})
	header, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"3A3020"}},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	incomeStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Color: "3D9A68"},
		NumFmt: 4, // #,##0.00
	})
	expenseStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Color: "C04848"},
		NumFmt: 4,
	})
	numStyle, _ := f.NewStyle(&excelize.Style{NumFmt: 4})
	boldNum, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}, NumFmt: 4})
	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	dayHeader, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 11, Color: "3A3020"},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F5F0E8"}},
	})
	bankTransferStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"E0E0E0"}},
	})
	incomeBankStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Color: "3D9A68"},
		NumFmt: 4, // #,##0.00
		Fill:   excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"E0E0E0"}},
	})
	expenseBankStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Color: "C04848"},
		NumFmt: 4,
		Fill:   excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"E0E0E0"}},
	})

	// ════════════════════════════════════════════════════════════════════════
	// Sheet 1: รายรับ-รายจ่าย
	// ════════════════════════════════════════════════════════════════════════
	sheet1 := "รายรับ-รายจ่าย"
	f.SetSheetName("Sheet1", sheet1)

	// Title rows
	f.SetCellValue(sheet1, "A1", "รายงานรายรับ-รายจ่าย")
	f.SetCellStyle(sheet1, "A1", "A1", title)
	f.MergeCell(sheet1, "A1", "G1")

	beStart, beEnd := h.CeDateToBE(startDate), h.CeDateToBE(endDate)
	f.SetCellValue(sheet1, "A2", fmt.Sprintf("ช่วงวันที่: %s ถึง %s", beStart, beEnd))
	f.MergeCell(sheet1, "A2", "G2")

	generated := time.Now().Format("พิมพ์เมื่อ 02/01/2006 15:04")
	f.SetCellValue(sheet1, "A3", generated)
	f.MergeCell(sheet1, "A3", "G3")

	// Column widths
	f.SetColWidth(sheet1, "A", "A", 8)
	f.SetColWidth(sheet1, "B", "B", 16)
	f.SetColWidth(sheet1, "C", "C", 12)
	f.SetColWidth(sheet1, "D", "D", 20)
	f.SetColWidth(sheet1, "E", "E", 18)
	f.SetColWidth(sheet1, "F", "F", 14)
	f.SetColWidth(sheet1, "G", "G", 30)

	var grandIncome, grandExpense float64
	row := 5 // current row pointer

	for gi, g := range groups {
		// ── Day header row ──
		f.SetCellValue(sheet1, fmt.Sprintf("A%d", row), fmt.Sprintf("📅 %s", h.CeDateToBE(g.date)))
		f.MergeCell(sheet1, fmt.Sprintf("A%d", row), fmt.Sprintf("G%d", row))
		f.SetCellStyle(sheet1, fmt.Sprintf("A%d", row), fmt.Sprintf("G%d", row), dayHeader)
		row++

		// ── Column headers ──
		hdrs := []string{"ลำดับ", "วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน (บาท)", "แหล่งที่มา", "หมายเหตุ"}
		for i, hdr := range hdrs {
			col, _ := excelize.ColumnNumberToName(i + 1)
			f.SetCellValue(sheet1, fmt.Sprintf("%s%d", col, row), hdr)
			f.SetCellStyle(sheet1, fmt.Sprintf("%s%d", col, row), fmt.Sprintf("%s%d", col, row), header)
		}
		row++

		// ── Data rows for this day ──
		var dayIncome, dayExpense float64
		for i, e := range g.entries {
			typeLabel := "รายรับ"
			if e.Type == "expense" {
				typeLabel = "รายจ่าย"
			}
			sourceLabel := "บันทึกเอง"
			if e.Source == "auto" {
				sourceLabel = "อัตโนมัติ"
			}
			noteStr := e.Notes
			if e.IsBankTransfer {
				if noteStr != "" {
					noteStr += " "
				}
				noteStr += "(โอนผ่านธนาคาร)"
			}

			f.SetCellValue(sheet1, fmt.Sprintf("A%d", row), i+1)
			f.SetCellValue(sheet1, fmt.Sprintf("B%d", row), h.CeDateToBE(e.Date))
			f.SetCellValue(sheet1, fmt.Sprintf("C%d", row), typeLabel)
			f.SetCellValue(sheet1, fmt.Sprintf("D%d", row), e.Category)
			f.SetCellValue(sheet1, fmt.Sprintf("E%d", row), e.Amount)
			f.SetCellValue(sheet1, fmt.Sprintf("F%d", row), sourceLabel)
			f.SetCellValue(sheet1, fmt.Sprintf("G%d", row), noteStr)

			if e.IsBankTransfer {
				f.SetCellStyle(sheet1, fmt.Sprintf("A%d", row), fmt.Sprintf("G%d", row), bankTransferStyle)
			}

			if e.Type == "income" {
				if e.IsBankTransfer {
					f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), incomeBankStyle)
				} else {
					f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), incomeStyle)
				}
				dayIncome += e.Amount
			} else {
				if e.IsBankTransfer {
					f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), expenseBankStyle)
				} else {
					f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), expenseStyle)
				}
				dayExpense += e.Amount
			}
			row++
		}

		// ── Day subtotals ──
		f.SetCellValue(sheet1, fmt.Sprintf("D%d", row), "รวมรายรับ")
		f.SetCellStyle(sheet1, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), boldStyle)
		f.SetCellValue(sheet1, fmt.Sprintf("E%d", row), dayIncome)
		f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), incomeStyle)
		row++

		f.SetCellValue(sheet1, fmt.Sprintf("D%d", row), "รวมรายจ่าย")
		f.SetCellStyle(sheet1, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), boldStyle)
		f.SetCellValue(sheet1, fmt.Sprintf("E%d", row), dayExpense)
		f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), expenseStyle)
		row++

		f.SetCellValue(sheet1, fmt.Sprintf("D%d", row), "คงเหลือ")
		f.SetCellStyle(sheet1, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), boldStyle)
		f.SetCellValue(sheet1, fmt.Sprintf("E%d", row), dayIncome-dayExpense)
		f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), boldNum)
		row++

		grandIncome += dayIncome
		grandExpense += dayExpense

		// ── Empty separator row between days ──
		if gi < len(groups)-1 {
			row++
		}
	}

	// ── Grand totals ──
	row += 2
	f.SetCellValue(sheet1, fmt.Sprintf("C%d", row), "สรุปรวมทั้งหมด")
	f.SetCellStyle(sheet1, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), subtitle)
	row++

	f.SetCellValue(sheet1, fmt.Sprintf("D%d", row), "รวมรายรับทั้งหมด")
	f.SetCellStyle(sheet1, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), boldStyle)
	f.SetCellValue(sheet1, fmt.Sprintf("E%d", row), grandIncome)
	f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), incomeStyle)
	row++

	f.SetCellValue(sheet1, fmt.Sprintf("D%d", row), "รวมรายจ่ายทั้งหมด")
	f.SetCellStyle(sheet1, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), boldStyle)
	f.SetCellValue(sheet1, fmt.Sprintf("E%d", row), grandExpense)
	f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), expenseStyle)
	row++

	f.SetCellValue(sheet1, fmt.Sprintf("D%d", row), "คงเหลือสุทธิ")
	f.SetCellStyle(sheet1, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), boldStyle)
	f.SetCellValue(sheet1, fmt.Sprintf("E%d", row), grandIncome-grandExpense)
	f.SetCellStyle(sheet1, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), boldNum)

	// ════════════════════════════════════════════════════════════════════════
	// Sheet 2: เงินสดประจำวัน (Daily Cash)
	// ════════════════════════════════════════════════════════════════════════
	sheet2 := "เงินสดประจำวัน"
	f.NewSheet(sheet2)

	// Title rows
	f.SetCellValue(sheet2, "A1", "รายงานเงินสดประจำวัน")
	f.SetCellStyle(sheet2, "A1", "A1", title)
	f.MergeCell(sheet2, "A1", "F1")

	f.SetCellValue(sheet2, "A2", fmt.Sprintf("ช่วงวันที่: %s ถึง %s", beStart, beEnd))
	f.MergeCell(sheet2, "A2", "F2")

	f.SetCellValue(sheet2, "A3", generated)
	f.MergeCell(sheet2, "A3", "F3")

	// Column widths
	f.SetColWidth(sheet2, "A", "A", 16)
	f.SetColWidth(sheet2, "B", "B", 22)
	f.SetColWidth(sheet2, "C", "C", 18)
	f.SetColWidth(sheet2, "D", "D", 18)
	f.SetColWidth(sheet2, "E", "E", 14)
	f.SetColWidth(sheet2, "F", "F", 30)

	// Headers row 5
	cashHeaders := []string{"วันที่", "ยอดเงินสดล่าสุด (บาท)", "ยอดคาดหวัง (บาท)", "ยอดจริง (บาท)", "ส่วนต่าง (บาท)", "หมายเหตุ"}
	for i, hdr := range cashHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheet2, fmt.Sprintf("%s5", col), hdr)
		f.SetCellStyle(sheet2, fmt.Sprintf("%s5", col), fmt.Sprintf("%s5", col), header)
	}

	// Data rows
	for i, c := range cashEntries {
		r := i + 6
		diff := c.ActualAmount - c.ExpectedAmount

		f.SetCellValue(sheet2, fmt.Sprintf("A%d", r), h.CeDateToBE(c.Date))
		f.SetCellValue(sheet2, fmt.Sprintf("B%d", r), c.AmountLastRecord)
		f.SetCellStyle(sheet2, fmt.Sprintf("B%d", r), fmt.Sprintf("B%d", r), numStyle)
		f.SetCellValue(sheet2, fmt.Sprintf("C%d", r), c.ExpectedAmount)
		f.SetCellStyle(sheet2, fmt.Sprintf("C%d", r), fmt.Sprintf("C%d", r), numStyle)
		f.SetCellValue(sheet2, fmt.Sprintf("D%d", r), c.ActualAmount)
		f.SetCellStyle(sheet2, fmt.Sprintf("D%d", r), fmt.Sprintf("D%d", r), numStyle)
		f.SetCellValue(sheet2, fmt.Sprintf("E%d", r), diff)
		if diff < 0 {
			f.SetCellStyle(sheet2, fmt.Sprintf("E%d", r), fmt.Sprintf("E%d", r), expenseStyle)
		} else if diff > 0 {
			f.SetCellStyle(sheet2, fmt.Sprintf("E%d", r), fmt.Sprintf("E%d", r), incomeStyle)
		} else {
			f.SetCellStyle(sheet2, fmt.Sprintf("E%d", r), fmt.Sprintf("E%d", r), numStyle)
		}
		f.SetCellValue(sheet2, fmt.Sprintf("F%d", r), c.Notes)
	}

	return f.SaveAs(filePath)
}
