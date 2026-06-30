package settings_handler

import (
	"CervusLedger/db"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
)

// ImportResult holds the result of an Excel import operation.
type ImportResult struct {
	CustomersImported        int      `json:"customers_imported"`
	PawnRecordsImported      int      `json:"pawn_records_imported"`
	PawnPaymentsImported     int      `json:"pawn_payments_imported"`
	PrincipalChangesImported int      `json:"principal_changes_imported"`
	Warnings                 []string `json:"warnings"`
	Cancelled                bool     `json:"cancelled"`
}

// Sheet names (Thai)
const (
	sheetCustomers        = "ลูกค้า"
	sheetPawnRecords      = "รายการจำนำ"
	sheetPawnPayments     = "การชำระดอกเบี้ย"
	sheetPrincipalChanges = "การเปลี่ยนแปลงเงินต้น"
)

// thaiToCE converts a Thai Buddhist Era date string to CE.
// Input: "2568-01-15" → Output: "2025-01-15"
func thaiToCE(thaiDate string) string {
	if thaiDate == "" {
		return ""
	}
	parts := strings.Split(strings.TrimSpace(thaiDate), "-")
	if len(parts) != 3 {
		return thaiDate
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil {
		return thaiDate
	}
	ceYear := year - 543
	return fmt.Sprintf("%d-%s-%s", ceYear, parts[1], parts[2])
}

// cellStr safely reads a cell value as a trimmed string.
func cellStr(row []string, idx int) string {
	if idx >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[idx])
}

// ImportFromXlsx opens a file picker, confirms with the user, and imports data from an xlsx file.
func (h *SettingsHandler) ImportFromXlsx() (*ImportResult, error) {
	// 1. Open file picker
	filePath, err := runtime.OpenFileDialog(h.ctx, runtime.OpenDialogOptions{
		Title: "เลือกไฟล์ Excel สำหรับนำเข้า",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("เปิดไฟล์ไม่สำเร็จ: %w", err)
	}
	if filePath == "" {
		return &ImportResult{Cancelled: true}, nil // user cancelled file picker
	}

	// 2. Confirmation dialog
	result, err := runtime.MessageDialog(h.ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         "ยืนยันการนำเข้าข้อมูล",
		Message:       "ต้องการรวมข้อมูลจากไฟล์นี้เข้ากับฐานข้อมูลปัจจุบันหรือไม่?\n\nข้อมูลที่ซ้ำจะถูกข้ามไป ข้อมูลที่มีอยู่แล้วจะไม่ถูกเขียนทับ",
		Buttons:       []string{"นำเข้า", "ยกเลิก"},
		DefaultButton: "นำเข้า",
		CancelButton:  "ยกเลิก",
	})
	if err != nil {
		return nil, fmt.Errorf("dialog error: %w", err)
	}
	if result != "นำเข้า" && result != "Yes" {
		return &ImportResult{Cancelled: true}, nil
	}

	// 3. Open Excel file
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("อ่านไฟล์ Excel ไม่สำเร็จ: %w", err)
	}
	defer f.Close()

	// 4. Begin transaction
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, fmt.Errorf("เริ่ม transaction ไม่สำเร็จ: %w", err)
	}
	defer tx.Rollback()

	res := &ImportResult{}

	// ── Import Customers ──
	if rows, err := f.GetRows(sheetCustomers); err == nil && len(rows) > 1 {
		for i, row := range rows {
			if i == 0 {
				continue // skip header
			}
			if len(row) < 3 {
				res.Warnings = append(res.Warnings, fmt.Sprintf("ลูกค้า แถว %d: คอลัมน์ไม่ครบ (ต้องการอย่างน้อย 3 คอลัมน์)", i+1))
				continue
			}

			prefix := cellStr(row, 0)
			firstname := cellStr(row, 1)
			lastname := cellStr(row, 2)
			phone := cellStr(row, 3)
			idCardVal := cellStr(row, 4)
			addressNo := cellStr(row, 5)
			addressLine := cellStr(row, 6)
			moo := cellStr(row, 7)
			road := cellStr(row, 8)
			tambon := cellStr(row, 9)
			amphoe := cellStr(row, 10)
			province := cellStr(row, 11)

			if firstname == "" {
				res.Warnings = append(res.Warnings, fmt.Sprintf("ลูกค้า แถว %d: ไม่มีชื่อ", i+1))
				continue
			}

			var idCard *string
			if idCardVal != "" {
				idCard = &idCardVal
			}

			var existingID int
			var checkErr error
			if idCard != nil {
				checkErr = tx.QueryRow(`SELECT id FROM customers WHERE id_card = ?`, *idCard).Scan(&existingID)
			} else {
				checkErr = tx.QueryRow(`SELECT id FROM customers WHERE firstname = ? AND lastname = ?`, firstname, lastname).Scan(&existingID)
			}

			if checkErr == nil {
				// Customer already exists, skip inserting
				continue
			} else if checkErr != sql.ErrNoRows {
				res.Warnings = append(res.Warnings, fmt.Sprintf("ลูกค้า แถว %d: ตรวจสอบข้อมูลซ้ำล้มเหลว: %v", i+1, checkErr))
				continue
			}

			_, err = tx.Exec(`
				INSERT INTO customers (prefix, firstname, lastname, phone, id_card, address_no, address_line, moo, road, tambon, amphoe, province)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				prefix, firstname, lastname, phone, idCard, addressNo, addressLine, moo, road, tambon, amphoe, province,
			)
			if err != nil {
				res.Warnings = append(res.Warnings, fmt.Sprintf("ลูกค้า แถว %d: %v", i+1, err))
				continue
			}
			res.CustomersImported++
		}
	}

	// ── Import Pawn Records ──
	if rows, err := f.GetRows(sheetPawnRecords); err == nil && len(rows) > 1 {
		for i, row := range rows {
			if i == 0 {
				continue
			}
			if len(row) < 8 {
				res.Warnings = append(res.Warnings, fmt.Sprintf("รายการจำนำ แถว %d: คอลัมน์ไม่ครบ (ต้องการอย่างน้อย 8 คอลัมน์)", i+1))
				continue
			}

			ticketNumber := cellStr(row, 0)
			customerIDCard := cellStr(row, 1)
			itemType := cellStr(row, 2)
			weightGrams := cellStr(row, 3)
			if weightGrams == "" {
				weightGrams = "0"
			}
			description := cellStr(row, 4)
			pawnedDate := thaiToCE(cellStr(row, 5))
			principal := cellStr(row, 6)
			if principal == "" {
				principal = "0"
			}
			interestRate := cellStr(row, 7)
			if interestRate == "" {
				interestRate = "0"
			}
			status := cellStr(row, 8)
			if status == "" {
				status = "active"
			}
			ticketStatus := cellStr(row, 9)
			if ticketStatus == "" {
				ticketStatus = "active"
			}

			principalF, _ := strconv.ParseFloat(principal, 64)
			rateF, _ := strconv.ParseFloat(interestRate, 64)
			interestAmt := principalF * rateF / 100

			// Look up customer by ID card within the transaction
			var customerID int
			err := tx.QueryRow(
				`SELECT id FROM customers WHERE id_card = ?`, customerIDCard,
			).Scan(&customerID)
			if err != nil {
				res.Warnings = append(res.Warnings, fmt.Sprintf("รายการจำนำ แถว %d: ไม่พบลูกค้าเลขบัตร %s", i+1, customerIDCard))
				continue
			}

			// Check for duplicate pawn record (same ticket_number, customer_id, pawned_date)
			var existingPawnID int
			checkErr := tx.QueryRow(`
				SELECT id FROM pawn_records 
				WHERE ticket_number = ? AND customer_id = ? AND pawned_date = ?
			`, ticketNumber, customerID, pawnedDate).Scan(&existingPawnID)

			if checkErr == nil {
				// Pawn record already exists, skip
				continue
			} else if checkErr != sql.ErrNoRows {
				res.Warnings = append(res.Warnings, fmt.Sprintf("รายการจำนำ แถว %d: ตรวจสอบข้อมูลซ้ำล้มเหลว: %v", i+1, checkErr))
				continue
			}

			_, err = tx.Exec(`
				INSERT INTO pawn_records 
				(ticket_number, customer_id, item_type, weight_grams, description,
				 pawned_date, principal_amount, interest_amount, monthly_interest_rate,
				 status, ticket_status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				ticketNumber, customerID, itemType, weightGrams, description,
				pawnedDate, principal, interestAmt, interestRate,
				status, ticketStatus,
			)
			if err != nil {
				res.Warnings = append(res.Warnings, fmt.Sprintf("รายการจำนำ แถว %d: %v", i+1, err))
				continue
			}
			res.PawnRecordsImported++
		}
	}

	// ── Import Pawn Payments ──
	if rows, err := f.GetRows(sheetPawnPayments); err == nil && len(rows) > 1 {
		for i, row := range rows {
			if i == 0 {
				continue
			}
			if len(row) < 4 {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การชำระดอกเบี้ย แถว %d: คอลัมน์ไม่ครบ (ต้องการอย่างน้อย 4 คอลัมน์)", i+1))
				continue
			}

			ticketNumber := cellStr(row, 0)
			month := cellStr(row, 1)
			year := cellStr(row, 2)

			// Convert standalone Year from BE to CE
			if yInt, err := strconv.Atoi(year); err == nil {
				year = strconv.Itoa(yInt - 543)
			}

			paidDate := thaiToCE(cellStr(row, 3))
			notes := cellStr(row, 4)

			// Look up pawn record by ticket number and paidDate (date-based matching)
			var pawnID int
			var lookupErr error
			if paidDate != "" {
				lookupErr = tx.QueryRow(`
					SELECT id FROM pawn_records 
					WHERE ticket_number = ? AND pawned_date <= ?
					ORDER BY pawned_date DESC 
					LIMIT 1`, ticketNumber, paidDate,
				).Scan(&pawnID)
			}

			if paidDate == "" || lookupErr == sql.ErrNoRows {
				lookupErr = tx.QueryRow(`
					SELECT id FROM pawn_records 
					WHERE ticket_number = ?
					ORDER BY pawned_date DESC 
					LIMIT 1`, ticketNumber,
				).Scan(&pawnID)
			}

			if lookupErr != nil {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การชำระดอกเบี้ย แถว %d: ไม่พบตั๋วเลขที่ %s", i+1, ticketNumber))
				continue
			}

			// Check for duplicate payment (same pawn_record_id, month, year)
			var existingPaymentID int
			checkErr := tx.QueryRow(`
				SELECT id FROM pawn_payments 
				WHERE pawn_record_id = ? AND month = ? AND year = ?
			`, pawnID, month, year).Scan(&existingPaymentID)

			if checkErr == nil {
				// Payment already exists, skip
				continue
			} else if checkErr != sql.ErrNoRows {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การชำระดอกเบี้ย แถว %d: ตรวจสอบข้อมูลซ้ำล้มเหลว: %v", i+1, checkErr))
				continue
			}

			_, err = tx.Exec(`
				INSERT INTO pawn_payments (pawn_record_id, month, year, paid_date, notes)
				VALUES (?, ?, ?, ?, ?)`,
				pawnID, month, year, paidDate, notes,
			)
			if err != nil {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การชำระดอกเบี้ย แถว %d: %v", i+1, err))
				continue
			}
			res.PawnPaymentsImported++
		}
	}

	// ── Import Principal Changes ──
	if rows, err := f.GetRows(sheetPrincipalChanges); err == nil && len(rows) > 1 {
		for i, row := range rows {
			if i == 0 {
				continue
			}
			if len(row) < 5 {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การเปลี่ยนแปลงเงินต้น แถว %d: คอลัมน์ไม่ครบ (ต้องการอย่างน้อย 5 คอลัมน์)", i+1))
				continue
			}

			ticketNumber := cellStr(row, 0)
			date := thaiToCE(cellStr(row, 1))
			changeType := cellStr(row, 2)
			amount := cellStr(row, 3)
			if amount == "" {
				amount = "0"
			}
			newPrincipal := cellStr(row, 4)
			if newPrincipal == "" {
				newPrincipal = "0"
			}
			notes := cellStr(row, 5)

			// Look up pawn record by ticket number and date (date-based matching)
			var pawnID int
			var lookupErr error
			if date != "" {
				lookupErr = tx.QueryRow(`
					SELECT id FROM pawn_records 
					WHERE ticket_number = ? AND pawned_date <= ?
					ORDER BY pawned_date DESC 
					LIMIT 1`, ticketNumber, date,
				).Scan(&pawnID)
			}

			if date == "" || lookupErr == sql.ErrNoRows {
				lookupErr = tx.QueryRow(`
					SELECT id FROM pawn_records 
					WHERE ticket_number = ?
					ORDER BY pawned_date DESC 
					LIMIT 1`, ticketNumber,
				).Scan(&pawnID)
			}

			if lookupErr != nil {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การเปลี่ยนแปลงเงินต้น แถว %d: ไม่พบตั๋วเลขที่ %s", i+1, ticketNumber))
				continue
			}

			// Check for duplicate principal change (same pawn_record_id, date, change_type, amount)
			var existingChangeID int
			checkErr := tx.QueryRow(`
				SELECT id FROM principal_changes 
				WHERE pawn_record_id = ? AND date(date) = date(?) AND change_type = ? AND amount = ?
			`, pawnID, date, changeType, amount).Scan(&existingChangeID)

			if checkErr == nil {
				// Principal change already exists, skip
				continue
			} else if checkErr != sql.ErrNoRows {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การเปลี่ยนแปลงเงินต้น แถว %d: ตรวจสอบข้อมูลซ้ำล้มเหลว: %v", i+1, checkErr))
				continue
			}

			_, err = tx.Exec(`
				INSERT INTO principal_changes 
				(pawn_record_id, date, change_type, amount, new_principal, notes)
				VALUES (?, ?, ?, ?, ?, ?)`,
				pawnID, date, changeType, amount, newPrincipal, notes,
			)
			if err != nil {
				res.Warnings = append(res.Warnings, fmt.Sprintf("การเปลี่ยนแปลงเงินต้น แถว %d: %v", i+1, err))
				continue
			}
			res.PrincipalChangesImported++
		}
	}

	// 5. Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("บันทึกข้อมูลไม่สำเร็จ: %w", err)
	}

	return res, nil
}

// DownloadImportTemplate generates and saves a blank xlsx template file with Thai headers.
func (h *SettingsHandler) DownloadImportTemplate() error {
	// Save dialog
	filePath, err := runtime.SaveFileDialog(h.ctx, runtime.SaveDialogOptions{
		Title:           "บันทึกแม่แบบนำเข้าข้อมูล",
		DefaultFilename: "แม่แบบนำเข้า_CervusLedger.xlsx",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return fmt.Errorf("dialog error: %w", err)
	}
	if filePath == "" {
		return nil // user cancelled
	}

	f := excelize.NewFile()
	defer f.Close()

	// ── Styles ──
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"3A3020"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	hintStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Color: "888888", Size: 10},
		Alignment: &excelize.Alignment{Horizontal: "left"},
	})

	// ── Sheet 1: ลูกค้า ──
	f.SetSheetName("Sheet1", sheetCustomers)
	custHeaders := []string{"คำนำหน้า", "ชื่อ", "นามสกุล", "เบอร์โทร", "เลขบัตรประชาชน", "บ้านเลขที่", "ที่อยู่", "หมู่", "ถนน", "ตำบล", "อำเภอ", "จังหวัด"}
	custHints := []string{"นาย/นาง/นางสาว", "", "", "08x-xxx-xxxx", "13 หลัก", "", "", "", "", "", "", ""}
	for i, h := range custHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetCustomers, fmt.Sprintf("%s1", col), h)
		f.SetCellStyle(sheetCustomers, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		if custHints[i] != "" {
			f.SetCellValue(sheetCustomers, fmt.Sprintf("%s2", col), custHints[i])
			f.SetCellStyle(sheetCustomers, fmt.Sprintf("%s2", col), fmt.Sprintf("%s2", col), hintStyle)
		}
		f.SetColWidth(sheetCustomers, col, col, 18)
	}

	// ── Sheet 2: รายการจำนำ ──
	f.NewSheet(sheetPawnRecords)
	pawnHeaders := []string{"เลขตั๋ว", "เลขบัตรลูกค้า", "ประเภททอง", "น้ำหนัก(กรัม)", "รายละเอียด", "วันจำนำ", "เงินต้น", "อัตราดอกเบี้ย(%)", "สถานะ", "สถานะตั๋ว"}
	pawnHints := []string{"", "13 หลัก", "ทองรูปพรรณ/ทองแท่ง", "0.00", "", "พ.ศ.-เดือน-วัน", "0.00", "0.00", "active/redeemed/forfeited", "active/closed"}
	for i, h := range pawnHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetPawnRecords, fmt.Sprintf("%s1", col), h)
		f.SetCellStyle(sheetPawnRecords, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		if pawnHints[i] != "" {
			f.SetCellValue(sheetPawnRecords, fmt.Sprintf("%s2", col), pawnHints[i])
			f.SetCellStyle(sheetPawnRecords, fmt.Sprintf("%s2", col), fmt.Sprintf("%s2", col), hintStyle)
		}
		f.SetColWidth(sheetPawnRecords, col, col, 20)
	}

	// ── Sheet 3: การชำระดอกเบี้ย ──
	f.NewSheet(sheetPawnPayments)
	payHeaders := []string{"เลขตั๋ว", "เดือน", "ปี(พ.ศ.)", "วันที่ชำระ", "หมายเหตุ"}
	payHints := []string{"", "1-12", "พ.ศ.", "พ.ศ.-เดือน-วัน", ""}
	for i, h := range payHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetPawnPayments, fmt.Sprintf("%s1", col), h)
		f.SetCellStyle(sheetPawnPayments, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		if payHints[i] != "" {
			f.SetCellValue(sheetPawnPayments, fmt.Sprintf("%s2", col), payHints[i])
			f.SetCellStyle(sheetPawnPayments, fmt.Sprintf("%s2", col), fmt.Sprintf("%s2", col), hintStyle)
		}
		f.SetColWidth(sheetPawnPayments, col, col, 18)
	}

	// ── Sheet 4: การเปลี่ยนแปลงเงินต้น ──
	f.NewSheet(sheetPrincipalChanges)
	pcHeaders := []string{"เลขตั๋ว", "วันที่", "ประเภท", "จำนวนเงิน", "เงินต้นใหม่", "หมายเหตุ"}
	pcHints := []string{"", "พ.ศ.-เดือน-วัน", "increase/decrease", "0.00", "0.00", ""}
	for i, h := range pcHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetPrincipalChanges, fmt.Sprintf("%s1", col), h)
		f.SetCellStyle(sheetPrincipalChanges, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		if pcHints[i] != "" {
			f.SetCellValue(sheetPrincipalChanges, fmt.Sprintf("%s2", col), pcHints[i])
			f.SetCellStyle(sheetPrincipalChanges, fmt.Sprintf("%s2", col), fmt.Sprintf("%s2", col), hintStyle)
		}
		f.SetColWidth(sheetPrincipalChanges, col, col, 20)
	}

	return f.SaveAs(filePath)
}

// ExportResult holds the result of an Excel export operation.
type ExportResult struct {
	CustomersExported        int  `json:"customers_exported"`
	PawnRecordsExported      int  `json:"pawn_records_exported"`
	PawnPaymentsExported     int  `json:"pawn_payments_exported"`
	PrincipalChangesExported int  `json:"principal_changes_exported"`
	Cancelled                bool `json:"cancelled"`
}

// ceToThai converts a CE date string to Thai Buddhist Era.
// Input: "2025-01-15" → Output: "2568-01-15"
func ceToThai(ceDate string) string {
	if ceDate == "" {
		return ""
	}
	parts := strings.Split(strings.TrimSpace(ceDate), "-")
	if len(parts) != 3 {
		// Try splitting by space in case of datetime
		subParts := strings.Split(strings.TrimSpace(ceDate), " ")
		if len(subParts) > 0 {
			parts = strings.Split(subParts[0], "-")
		}
	}
	if len(parts) != 3 {
		return ceDate
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil {
		return ceDate
	}
	thaiYear := year + 543
	return fmt.Sprintf("%d-%s-%s", thaiYear, parts[1], parts[2])
}

// ExportToXlsx exports the entire database into an Excel file matching the import format.
func (h *SettingsHandler) ExportToXlsx() (*ExportResult, error) {
	// 1. Save dialog
	filePath, err := runtime.SaveFileDialog(h.ctx, runtime.SaveDialogOptions{
		Title:           "ส่งออกข้อมูลเป็นไฟล์ Excel",
		DefaultFilename: "ข้อมูลส่งออก_CervusLedger.xlsx",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("dialog error: %w", err)
	}
	if filePath == "" {
		return &ExportResult{Cancelled: true}, nil // User cancelled
	}

	f := excelize.NewFile()
	defer f.Close()

	// ── Styles ──
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"3A3020"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	res := &ExportResult{}

	// ── Sheet 1: ลูกค้า ──
	f.SetSheetName("Sheet1", sheetCustomers)
	custHeaders := []string{"คำนำหน้า", "ชื่อ", "นามสกุล", "เบอร์โทร", "เลขบัตรประชาชน", "บ้านเลขที่", "ที่อยู่", "หมู่", "ถนน", "ตำบล", "อำเภอ", "จังหวัด"}
	for i, hName := range custHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetCustomers, fmt.Sprintf("%s1", col), hName)
		f.SetCellStyle(sheetCustomers, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		f.SetColWidth(sheetCustomers, col, col, 18)
	}

	custRows, err := db.DB.Query(`
		SELECT prefix, firstname, lastname, phone, id_card, address_no, address_line, moo, road, tambon, amphoe, province 
		FROM customers
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query customers error: %w", err)
	}
	defer custRows.Close()

	rowIdx := 2
	for custRows.Next() {
		var prefix, phone, idCard, addressNo, addressLine, moo, road, tambon, amphoe, province *string
		var firstname, lastname string
		err := custRows.Scan(
			&prefix, &firstname, &lastname, &phone, &idCard,
			&addressNo, &addressLine, &moo, &road, &tambon, &amphoe, &province,
		)
		if err != nil {
			return nil, fmt.Errorf("scan customer error: %w", err)
		}

		vals := []interface{}{
			ptrStr(prefix), firstname, lastname, ptrStr(phone), ptrStr(idCard),
			ptrStr(addressNo), ptrStr(addressLine), ptrStr(moo), ptrStr(road),
			ptrStr(tambon), ptrStr(amphoe), ptrStr(province),
		}
		for colI, val := range vals {
			col, _ := excelize.ColumnNumberToName(colI + 1)
			f.SetCellValue(sheetCustomers, fmt.Sprintf("%s%d", col, rowIdx), val)
		}
		res.CustomersExported++
		rowIdx++
	}

	// ── Sheet 2: รายการจำนำ ──
	f.NewSheet(sheetPawnRecords)
	pawnHeaders := []string{"เลขตั๋ว", "เลขบัตรลูกค้า", "ประเภททอง", "น้ำหนัก(กรัม)", "รายละเอียด", "วันจำนำ", "เงินต้น", "อัตราดอกเบี้ย(%)", "สถานะ", "สถานะตั๋ว"}
	for i, hName := range pawnHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetPawnRecords, fmt.Sprintf("%s1", col), hName)
		f.SetCellStyle(sheetPawnRecords, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		f.SetColWidth(sheetPawnRecords, col, col, 20)
	}

	pawnRows, err := db.DB.Query(`
		SELECT pr.ticket_number, c.id_card, pr.item_type, pr.weight_grams, pr.description,
		       pr.pawned_date, pr.principal_amount, pr.monthly_interest_rate, pr.status, pr.ticket_status
		FROM pawn_records pr
		LEFT JOIN customers c ON pr.customer_id = c.id
		ORDER BY pr.id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query pawn_records error: %w", err)
	}
	defer pawnRows.Close()

	rowIdx = 2
	for pawnRows.Next() {
		var ticketNumber *int
		var idCard, itemType, description, pawnedDate, status, ticketStatus *string
		var weightGrams, principalAmount, monthlyInterestRate *float64
		err := pawnRows.Scan(
			&ticketNumber, &idCard, &itemType, &weightGrams, &description,
			&pawnedDate, &principalAmount, &monthlyInterestRate, &status, &ticketStatus,
		)
		if err != nil {
			return nil, fmt.Errorf("scan pawn_record error: %w", err)
		}

		vals := []interface{}{
			ptrInt(ticketNumber), ptrStr(idCard), ptrStr(itemType), ptrFloat(weightGrams), ptrStr(description),
			ceToThai(ptrStr(pawnedDate)), ptrFloat(principalAmount), ptrFloat(monthlyInterestRate), ptrStr(status), ptrStr(ticketStatus),
		}
		for colI, val := range vals {
			col, _ := excelize.ColumnNumberToName(colI + 1)
			f.SetCellValue(sheetPawnRecords, fmt.Sprintf("%s%d", col, rowIdx), val)
		}
		res.PawnRecordsExported++
		rowIdx++
	}

	// ── Sheet 3: การชำระดอกเบี้ย ──
	f.NewSheet(sheetPawnPayments)
	payHeaders := []string{"เลขตั๋ว", "เดือน", "ปี(พ.ศ.)", "วันที่ชำระ", "หมายเหตุ"}
	for i, hName := range payHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetPawnPayments, fmt.Sprintf("%s1", col), hName)
		f.SetCellStyle(sheetPawnPayments, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		f.SetColWidth(sheetPawnPayments, col, col, 18)
	}

	payRows, err := db.DB.Query(`
		SELECT pr.ticket_number, pp.month, pp.year, pp.paid_date, pp.notes
		FROM pawn_payments pp
		LEFT JOIN pawn_records pr ON pp.pawn_record_id = pr.id
		ORDER BY pp.id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query pawn_payments error: %w", err)
	}
	defer payRows.Close()

	rowIdx = 2
	for payRows.Next() {
		var ticketNumber, month, year *int
		var paidDate, notes *string
		err := payRows.Scan(&ticketNumber, &month, &year, &paidDate, &notes)
		if err != nil {
			return nil, fmt.Errorf("scan pawn_payment error: %w", err)
		}

		vals := []interface{}{
			ptrInt(ticketNumber), ptrInt(month), ptrIntAdd(year, 543), ceToThai(ptrStr(paidDate)), ptrStr(notes),
		}
		for colI, val := range vals {
			col, _ := excelize.ColumnNumberToName(colI + 1)
			f.SetCellValue(sheetPawnPayments, fmt.Sprintf("%s%d", col, rowIdx), val)
		}
		res.PawnPaymentsExported++
		rowIdx++
	}

	// ── Sheet 4: การเปลี่ยนแปลงเงินต้น ──
	f.NewSheet(sheetPrincipalChanges)
	pcHeaders := []string{"เลขตั๋ว", "วันที่", "ประเภท", "จำนวนเงิน", "เงินต้นใหม่", "หมายเหตุ"}
	for i, hName := range pcHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheetPrincipalChanges, fmt.Sprintf("%s1", col), hName)
		f.SetCellStyle(sheetPrincipalChanges, fmt.Sprintf("%s1", col), fmt.Sprintf("%s1", col), headerStyle)
		f.SetColWidth(sheetPrincipalChanges, col, col, 20)
	}

	pcRows, err := db.DB.Query(`
		SELECT pr.ticket_number, pc.date, pc.change_type, pc.amount, pc.new_principal, pc.notes
		FROM principal_changes pc
		LEFT JOIN pawn_records pr ON pc.pawn_record_id = pr.id
		ORDER BY pc.id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query principal_changes error: %w", err)
	}
	defer pcRows.Close()

	rowIdx = 2
	for pcRows.Next() {
		var ticketNumber *int
		var date, changeType, notes *string
		var amount, newPrincipal *float64
		err := pcRows.Scan(&ticketNumber, &date, &changeType, &amount, &newPrincipal, &notes)
		if err != nil {
			return nil, fmt.Errorf("scan principal_change error: %w", err)
		}

		vals := []interface{}{
			ptrInt(ticketNumber), ceToThai(ptrStr(date)), ptrStr(changeType), ptrFloat(amount), ptrFloat(newPrincipal), ptrStr(notes),
		}
		for colI, val := range vals {
			col, _ := excelize.ColumnNumberToName(colI + 1)
			f.SetCellValue(sheetPrincipalChanges, fmt.Sprintf("%s%d", col, rowIdx), val)
		}
		res.PrincipalChangesExported++
		rowIdx++
	}

	err = f.SaveAs(filePath)
	if err != nil {
		return nil, fmt.Errorf("save file error: %w", err)
	}

	return res, nil
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ptrInt(i *int) interface{} {
	if i == nil {
		return ""
	}
	return *i
}

func ptrIntAdd(i *int, add int) interface{} {
	if i == nil {
		return ""
	}
	return *i + add
}

func ptrFloat(f *float64) interface{} {
	if f == nil {
		return ""
	}
	return *f
}

