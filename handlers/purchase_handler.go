package handlers

import (
	"context"
	"fmt"
	"time"

	"CervusLedger/db"
	"CervusLedger/models"
)

type PurchaseHandler struct {
	ctx context.Context
}

func NewPurchaseHandler() *PurchaseHandler {
	return &PurchaseHandler{}
}

func (h *PurchaseHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *PurchaseHandler) ListPurchasedGold() ([]models.PurchasedGold, error) {
	query := `
		SELECT 
			p.id,
			p.customer_id,
			COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, 'ลูกค้าทั่วไป') as customer_name,
			p.type,
			'' as subtype,
			COALESCE(p.weight_grams, 0.0) as weight_grams,
			p.total_amount,
			p.notes,
			p.date,
			p.is_inventory,
			p.still_exists,
			p.created_at
		FROM purchased_gold p
		LEFT JOIN customers c ON p.customer_id = c.id
		ORDER BY p.date ASC, p.created_at ASC
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("list purchased gold: %w", err)
	}
	defer rows.Close()

	var list []models.PurchasedGold
	for rows.Next() {
		var p models.PurchasedGold
		if err := rows.Scan(
			&p.ID, &p.CustomerID, &p.CustomerName, &p.Type, &p.Subtype, &p.WeightGrams,
			&p.TotalAmount, &p.Notes, &p.Date, &p.IsInventory, &p.StillExists,
			&p.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan purchased gold: %w", err)
		}
		list = append(list, p)
	}
	return list, nil
}

func (h *PurchaseHandler) ToggleStillExists(id int, stillExists int) error {
	_, err := db.DB.Exec(`
		UPDATE purchased_gold
		SET still_exists = ?
		WHERE id = ?
	`, stillExists, id)
	return err
}

func (h *PurchaseHandler) GetCustomerPurchaseRecords(customerID int) ([]models.PurchasedGold, error) {
	query := `
		SELECT 
			p.id,
			p.customer_id,
			COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, 'ลูกค้าทั่วไป') as customer_name,
			p.type,
			'' as subtype,
			COALESCE(p.weight_grams, 0.0) as weight_grams,
			p.total_amount,
			p.notes,
			p.date,
			p.is_inventory,
			p.still_exists,
			p.created_at
		FROM purchased_gold p
		LEFT JOIN customers c ON p.customer_id = c.id
		WHERE p.customer_id = ?
		ORDER BY p.date ASC, p.created_at ASC
	`
	rows, err := db.DB.Query(query, customerID)
	if err != nil {
		return nil, fmt.Errorf("get customer purchase records: %w", err)
	}
	defer rows.Close()

	var list []models.PurchasedGold
	for rows.Next() {
		var p models.PurchasedGold
		if err := rows.Scan(
			&p.ID, &p.CustomerID, &p.CustomerName, &p.Type, &p.Subtype, &p.WeightGrams,
			&p.TotalAmount, &p.Notes, &p.Date, &p.IsInventory, &p.StillExists,
			&p.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan customer purchase gold: %w", err)
		}
		list = append(list, p)
	}
	return list, nil
}

func (h *PurchaseHandler) UpdateNotes(id int, notes string) error {
	_, err := db.DB.Exec(`
		UPDATE purchased_gold
		SET notes = ?
		WHERE id = ?
	`, notes, id)
	return err
}

func (h *PurchaseHandler) ToggleIsInventory(id int, isInventory int) error {
	_, err := db.DB.Exec(`
		UPDATE purchased_gold
		SET is_inventory = ?
		WHERE id = ?
	`, isInventory, id)
	return err
}

func (h *PurchaseHandler) CastToInventory(purchaseID int, goldItemID int) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Set is_inventory = 1
	_, err = tx.Exec(`
		UPDATE purchased_gold
		SET is_inventory = 1
		WHERE id = ?
	`, purchaseID)
	if err != nil {
		return err
	}

	// 2. Increment stock log for today's date
	logDate := time.Now().Format("2006-01-02") + " 00:00:00"

	var currentAmount int
	err = tx.QueryRow(`
		SELECT amount FROM gold_stock_logs 
		WHERE gold_item_id = ? AND log_date = ?
	`, goldItemID, logDate).Scan(&currentAmount)
	if err == nil {
		_, err = tx.Exec(`
			UPDATE gold_stock_logs SET amount = amount + 1
			WHERE gold_item_id = ? AND log_date = ?
		`, goldItemID, logDate)
	} else {
		var latestAmount int
		err = tx.QueryRow(`
			SELECT amount FROM gold_stock_logs 
			WHERE gold_item_id = ? 
			ORDER BY log_date DESC LIMIT 1
		`, goldItemID).Scan(&latestAmount)
		if err != nil {
			latestAmount = 0
		}
		_, err = tx.Exec(`
			INSERT INTO gold_stock_logs (gold_item_id, amount, log_date)
			VALUES (?, ?, ?)
		`, goldItemID, latestAmount + 1, logDate)
	}
	if err != nil {
		return fmt.Errorf("increment stock log: %w", err)
	}

	return tx.Commit()
}


