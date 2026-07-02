package settings_handler

import (
	"CervusLedger/db"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ClearDataResult holds counts of deleted rows per table.
type ClearDataResult struct {
	CustomersDeleted        int64 `json:"customers_deleted"`
	PawnRecordsDeleted      int64 `json:"pawn_records_deleted"`
	PawnPaymentsDeleted     int64 `json:"pawn_payments_deleted"`
	PrincipalChangesDeleted int64 `json:"principal_changes_deleted"`
	Cancelled               bool  `json:"cancelled"`
}

// ClearAllData deletes all rows from customers, pawn_records, pawn_payments,
// and principal_changes tables. A native confirmation dialog is shown first.
func (h *SettingsHandler) ClearAllData() (*ClearDataResult, error) {
	// 1. Confirmation dialog
	result, err := runtime.MessageDialog(h.ctx, runtime.MessageDialogOptions{
		Type:          runtime.WarningDialog,
		Title:         "ยืนยันการลบข้อมูลทั้งหมด",
		Message:       "⚠️ การดำเนินการนี้จะลบข้อมูลต่อไปนี้อย่างถาวร:\n\n• ลูกค้าทั้งหมด\n• รายการจำนำทั้งหมด\n• การชำระดอกเบี้ยทั้งหมด\n• การเปลี่ยนแปลงเงินต้นทั้งหมด\n\nข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้ ต้องการดำเนินการต่อหรือไม่?",
		Buttons:       []string{"ลบทั้งหมด", "ยกเลิก"},
		DefaultButton: "ยกเลิก",
		CancelButton:  "ยกเลิก",
	})
	if err != nil {
		return nil, fmt.Errorf("dialog error: %w", err)
	}
	if result != "ลบทั้งหมด" && result != "Yes" && result != "Ok" && result != "OK" {
		return &ClearDataResult{Cancelled: true}, nil
	}

	// 2. Begin transaction
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, fmt.Errorf("เริ่ม transaction ไม่สำเร็จ: %w", err)
	}
	defer tx.Rollback()

	res := &ClearDataResult{}

	// Delete in order: child tables first, then parent
	// principal_changes → pawn_payments → pawn_records → customers

	r, err := tx.Exec(`DELETE FROM principal_changes`)
	if err != nil {
		return nil, fmt.Errorf("ลบข้อมูลการเปลี่ยนแปลงเงินต้นไม่สำเร็จ: %w", err)
	}
	res.PrincipalChangesDeleted, _ = r.RowsAffected()

	r, err = tx.Exec(`DELETE FROM pawn_payments`)
	if err != nil {
		return nil, fmt.Errorf("ลบข้อมูลการชำระดอกเบี้ยไม่สำเร็จ: %w", err)
	}
	res.PawnPaymentsDeleted, _ = r.RowsAffected()

	r, err = tx.Exec(`DELETE FROM pawn_records`)
	if err != nil {
		return nil, fmt.Errorf("ลบข้อมูลรายการจำนำไม่สำเร็จ: %w", err)
	}
	res.PawnRecordsDeleted, _ = r.RowsAffected()

	r, err = tx.Exec(`DELETE FROM customers`)
	if err != nil {
		return nil, fmt.Errorf("ลบข้อมูลลูกค้าไม่สำเร็จ: %w", err)
	}
	res.CustomersDeleted, _ = r.RowsAffected()

	// 3. Commit
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("บันทึกการลบไม่สำเร็จ: %w", err)
	}

	return res, nil
}
