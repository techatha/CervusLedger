package handlers

import (
	"context"
	"fmt"

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
			COALESCE(c.prefix || c.firstname || ' ' || c.lastname, 'ลูกค้าทั่วไป') as customer_name,
			p.type,
			p.weight_baht,
			p.total_amount,
			p.notes,
			p.date,
			p.is_inventory,
			p.still_exists,
			p.created_at
		FROM purchased_gold p
		LEFT JOIN customers c ON p.customer_id = c.id
		ORDER BY p.date DESC, p.created_at DESC
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
			&p.ID, &p.CustomerID, &p.CustomerName, &p.Type, &p.WeightBaht,
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
			COALESCE(c.prefix || c.firstname || ' ' || c.lastname, 'ลูกค้าทั่วไป') as customer_name,
			p.type,
			p.weight_baht,
			p.total_amount,
			p.notes,
			p.date,
			p.is_inventory,
			p.still_exists,
			p.created_at
		FROM purchased_gold p
		LEFT JOIN customers c ON p.customer_id = c.id
		WHERE p.customer_id = ?
		ORDER BY p.date DESC, p.created_at DESC
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
			&p.ID, &p.CustomerID, &p.CustomerName, &p.Type, &p.WeightBaht,
			&p.TotalAmount, &p.Notes, &p.Date, &p.IsInventory, &p.StillExists,
			&p.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan customer purchase gold: %w", err)
		}
		list = append(list, p)
	}
	return list, nil
}
