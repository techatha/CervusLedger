package handlers

import (
	"fmt"

	"CervusLedger/db"
	"CervusLedger/models"
)

// AddPrincipalChange logs a reduction or increase and updates the pawn's
// stored interest_amount to reflect the new principal.
func (h *PawnHandler) AddPrincipalChange(input models.PrincipalChangeInput) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert the change record
	_, err = tx.Exec(`
		INSERT INTO principal_changes
		  (pawn_record_id, date, change_type, amount, new_principal, notes)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		input.PawnRecordID,
		input.Date,
		input.ChangeType,
		input.Amount,
		input.NewPrincipal,
		input.Notes,
	)
	if err != nil {
		return fmt.Errorf("insert principal change: %w", err)
	}

	// 2. Update the pawn's stored interest values so receipts / display stay correct
	_, err = tx.Exec(`
		UPDATE pawn_records
		SET monthly_interest_rate = ?, interest_amount = ?
		WHERE id = ?
	`, input.NewInterestRate, input.NewInterestAmount, input.PawnRecordID)
	if err != nil {
		return fmt.Errorf("update pawn interest: %w", err)
	}

	return tx.Commit()
}

// GetPrincipalChanges returns the full change log for a pawn, oldest first.
func (h *PawnHandler) GetPrincipalChanges(pawnRecordID int) ([]models.PrincipalChange, error) {
	rows, err := db.DB.Query(`
		SELECT id, pawn_record_id, date, change_type, amount, new_principal, notes
		FROM principal_changes
		WHERE pawn_record_id = ?
		ORDER BY date ASC, id ASC
	`, pawnRecordID)
	if err != nil {
		return nil, fmt.Errorf("get principal changes: %w", err)
	}
	defer rows.Close()

	var list []models.PrincipalChange
	for rows.Next() {
		var c models.PrincipalChange
		if err := rows.Scan(
			&c.ID, &c.PawnRecordID, &c.Date, &c.ChangeType,
			&c.Amount, &c.NewPrincipal, &c.Notes,
		); err != nil {
			return nil, fmt.Errorf("scan change: %w", err)
		}
		list = append(list, c)
	}
	return list, nil
}
