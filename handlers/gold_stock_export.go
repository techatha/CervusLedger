package handlers

import (
	"CervusLedger/db"
	"fmt"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
)

// Thai month abbreviations for sheet names
var thaiMonthAbbr = []string{
	"ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.",
	"พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.",
	"ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
}

var thaiMonthFull = []string{
	"มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
	"พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
	"กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
}

// ExportGoldStock opens a save dialog and exports gold stock history to xlsx.
func (h *GoldItemHandler) ExportGoldStock(startDate, endDate string) error {
	filePath, err := runtime.SaveFileDialog(h.ctx, runtime.SaveDialogOptions{
		Title:           "ส่งออกสต็อกทองคำ",
		DefaultFilename: fmt.Sprintf("สต็อกทองคำ_%s_%s.xlsx", startDate, endDate),
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
	return h.ExportGoldStockToXlsx(startDate, endDate, filePath)
}

// ExportGoldStockToXlsx writes gold stock history to an xlsx file.
// Each month in the range gets its own sheet. Rows = gold items, columns = days.
// Empty days carry forward the last known value; if no prior log → "—".
func (h *GoldItemHandler) ExportGoldStockToXlsx(startDate, endDate, filePath string) error {
	// ── Parse date range ──
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return fmt.Errorf("parse start date: %w", err)
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return fmt.Errorf("parse end date: %w", err)
	}

	// ── Fetch all gold items ──
	items, err := h.ListGoldItems("")
	if err != nil {
		return fmt.Errorf("list gold items for export: %w", err)
	}
	if len(items) == 0 {
		return fmt.Errorf("ไม่มีรายการทองคำในระบบ")
	}

	// ── Fetch all logs in the date range ──
	logRows, err := db.DB.Query(`
		SELECT gold_item_id, amount, log_date
		FROM gold_stock_logs
		WHERE date(log_date) >= ? AND date(log_date) <= ?
		ORDER BY log_date ASC
	`, startDate, endDate)
	if err != nil {
		return fmt.Errorf("query stock logs for export: %w", err)
	}
	defer logRows.Close()

	// Build map: itemID → date(YYYY-MM-DD) → amount
	logMap := make(map[int]map[string]int)
	for logRows.Next() {
		var itemID, amount int
		var logDate string
		logRows.Scan(&itemID, &amount, &logDate)
		if len(logDate) > 10 {
			logDate = logDate[:10]
		}
		if logMap[itemID] == nil {
			logMap[itemID] = make(map[string]int)
		}
		logMap[itemID][logDate] = amount
	}

	// ── Fetch the latest log BEFORE startDate per item (fill-forward seed) ──
	seedMap := make(map[int]int) // itemID → last known amount before range
	seedRows, err := db.DB.Query(`
		SELECT l.gold_item_id, l.amount
		FROM gold_stock_logs l
		INNER JOIN (
			SELECT gold_item_id, MAX(log_date) AS max_date
			FROM gold_stock_logs
			WHERE date(log_date) < ?
			GROUP BY gold_item_id
		) latest ON l.gold_item_id = latest.gold_item_id AND l.log_date = latest.max_date
	`, startDate)
	if err != nil {
		return fmt.Errorf("query seed logs for export: %w", err)
	}
	defer seedRows.Close()

	for seedRows.Next() {
		var itemID, amount int
		seedRows.Scan(&itemID, &amount)
		seedMap[itemID] = amount
	}

	// ── Build list of months to export ──
	type monthYear struct {
		year  int
		month time.Month
	}
	var months []monthYear
	cur := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.UTC)
	endMonth := time.Date(end.Year(), end.Month(), 1, 0, 0, 0, 0, time.UTC)
	for !cur.After(endMonth) {
		months = append(months, monthYear{year: cur.Year(), month: cur.Month()})
		cur = cur.AddDate(0, 1, 0)
	}

	// ── Create Excel file ──
	f := excelize.NewFile()
	defer f.Close()

	// Styles
	titleStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14}})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 10},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"3A3020"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	itemLabelStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 10},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F5F0E8"}},
	})
	cellCenter, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	dashStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Font:      &excelize.Font{Color: "AAAAAA"},
	})
	// Style for fill-forward values (slightly dimmer to distinguish from actual logs)
	fillFwdStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
		Font:      &excelize.Font{Color: "999999"},
	})

	// Track carry-forward values per item across months
	carryForward := make(map[int]int)   // itemID → last value
	hasEverLogged := make(map[int]bool) // itemID → whether we've ever seen a log
	for itemID, amount := range seedMap {
		carryForward[itemID] = amount
		hasEverLogged[itemID] = true
	}

	generated := time.Now().Format("พิมพ์เมื่อ 02/01/2006 15:04")

	for mi, my := range months {
		// ── Sheet name: Thai month abbr + BE year ──
		beYear := my.year + 543
		sheetName := fmt.Sprintf("%s %d", thaiMonthAbbr[my.month-1], beYear)

		if mi == 0 {
			f.SetSheetName("Sheet1", sheetName)
		} else {
			f.NewSheet(sheetName)
		}

		totalDays := goldDaysInMonth(my.year, int(my.month))
		lastCol, _ := excelize.ColumnNumberToName(totalDays + 1)

		// ── Title rows ──
		f.SetCellValue(sheetName, "A1", "รายงานสต็อกทองคำ")
		f.SetCellStyle(sheetName, "A1", "A1", titleStyle)
		f.MergeCell(sheetName, "A1", fmt.Sprintf("%s1", lastCol))

		f.SetCellValue(sheetName, "A2", fmt.Sprintf("%s %d", thaiMonthFull[my.month-1], beYear))
		f.MergeCell(sheetName, "A2", fmt.Sprintf("%s2", lastCol))

		f.SetCellValue(sheetName, "A3", generated)
		f.MergeCell(sheetName, "A3", fmt.Sprintf("%s3", lastCol))

		// ── Header row (row 5): "รายการ" | 1 | 2 | 3 | ... ──
		f.SetCellValue(sheetName, "A5", "รายการ")
		f.SetCellStyle(sheetName, "A5", "A5", headerStyle)
		f.SetColWidth(sheetName, "A", "A", 28)

		for d := 1; d <= totalDays; d++ {
			col, _ := excelize.ColumnNumberToName(d + 1)
			f.SetCellValue(sheetName, fmt.Sprintf("%s5", col), d)
			f.SetCellStyle(sheetName, fmt.Sprintf("%s5", col), fmt.Sprintf("%s5", col), headerStyle)
			f.SetColWidth(sheetName, col, col, 6)
		}

		// ── Data rows (row 6+): one per gold item ──
		for i, item := range items {
			r := i + 6

			// Item label: "type subtype" + optional weight/purity
			label := fmt.Sprintf("%s %s", item.Type, item.Subtype)
			if item.WeightGrams > 0 && item.Purity != "" {
				label += fmt.Sprintf(" (%.2f ก. · %s%%)", item.WeightGrams, item.Purity)
			} else if item.WeightGrams > 0 {
				label += fmt.Sprintf(" (%.2f ก.)", item.WeightGrams)
			} else if item.Purity != "" {
				label += fmt.Sprintf(" (%s%%)", item.Purity)
			}

			f.SetCellValue(sheetName, fmt.Sprintf("A%d", r), label)
			f.SetCellStyle(sheetName, fmt.Sprintf("A%d", r), fmt.Sprintf("A%d", r), itemLabelStyle)

			for d := 1; d <= totalDays; d++ {
				dateStr := fmt.Sprintf("%04d-%02d-%02d", my.year, int(my.month), d)
				col, _ := excelize.ColumnNumberToName(d + 1)
				cell := fmt.Sprintf("%s%d", col, r)

				if amt, ok := logMap[item.ID][dateStr]; ok {
					// Actual log exists for this day
					f.SetCellValue(sheetName, cell, amt)
					f.SetCellStyle(sheetName, cell, cell, cellCenter)
					carryForward[item.ID] = amt
					hasEverLogged[item.ID] = true
				} else if hasEverLogged[item.ID] {
					// Fill forward with last known value
					f.SetCellValue(sheetName, cell, carryForward[item.ID])
					f.SetCellStyle(sheetName, cell, cell, fillFwdStyle)
				} else {
					// No log has ever been recorded → dash
					f.SetCellValue(sheetName, cell, "—")
					f.SetCellStyle(sheetName, cell, cell, dashStyle)
				}
			}
		}
	}

	return f.SaveAs(filePath)
}

// goldDaysInMonth returns the number of days in a given month.
func goldDaysInMonth(year, month int) int {
	return time.Date(year, time.Month(month+1), 0, 0, 0, 0, 0, time.UTC).Day()
}
