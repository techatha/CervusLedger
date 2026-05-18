package handlers

import (
	"context"
	"fmt"

	"CervusLedger/db"
	"CervusLedger/models"
)

type GoldItemHandler struct {
	ctx context.Context
}

func NewGoldHandler() *GoldItemHandler {
	return &GoldItemHandler{}
}

func (h *GoldItemHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *GoldItemHandler) ListGoldItems(status string) ([]models.GoldItem, error) {
	query := `
		SELECT id, type, weight_baht, purity, description, status, created_at
		FROM gold_items
		WHERE 1=1
	`
	args := []interface{}{}
	if status != "" {
		query += ` AND status = ?`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list gold items: %w", err)
	}
	defer rows.Close()

	var items []models.GoldItem
	for rows.Next() {
		var g models.GoldItem
		if err := rows.Scan(
			&g.ID, &g.Type, &g.WeightBaht, &g.Purity,
			&g.Description, &g.Status, &g.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan gold item: %w", err)
		}
		items = append(items, g)
	}
	return items, nil
}

func (h *GoldItemHandler) GetGoldItem(id int) (models.GoldItem, error) {
	var g models.GoldItem
	err := db.DB.QueryRow(`
		SELECT id, type, weight_baht, purity, description, status, created_at
		FROM gold_items WHERE id = ?
	`, id).Scan(
		&g.ID, &g.Type, &g.WeightBaht, &g.Purity,
		&g.Description, &g.Status, &g.CreatedAt,
	)
	if err != nil {
		return g, fmt.Errorf("get gold item %d: %w", id, err)
	}
	return g, nil
}

func (h *GoldItemHandler) CreateGoldItem(input models.GoldItemInput) (models.GoldItem, error) {
	status := input.Status
	if status == "" {
		status = "available"
	}
	res, err := db.DB.Exec(`
		INSERT INTO gold_items (type, weight_baht, purity, description, status)
		VALUES (?, ?, ?, ?, ?)
	`, input.Type, input.WeightBaht, input.Purity, input.Description, status)
	if err != nil {
		return models.GoldItem{}, fmt.Errorf("create gold item: %w", err)
	}
	id, _ := res.LastInsertId()
	return h.GetGoldItem(int(id))
}

func (h *GoldItemHandler) UpdateGoldItem(input models.GoldItemInput) error {
	_, err := db.DB.Exec(`
		UPDATE gold_items
		SET type = ?, weight_baht = ?, purity = ?, description = ?, status = ?
		WHERE id = ?
	`, input.Type, input.WeightBaht, input.Purity, input.Description, input.Status, input.ID)
	return err
}

func (h *GoldItemHandler) DeleteGoldItem(id int) error {
	res, err := db.DB.Exec(`DELETE FROM gold_items WHERE id = ? AND status = 'available'`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("ลบไม่ได้ — รายการที่ขายแล้วไม่สามารถลบได้")
	}
	return nil
}

// SetGoldItemStatus is used by the sales module to mark an item sold/available.
func (h *GoldItemHandler) SetGoldItemStatus(id int, status string) error {
	_, err := db.DB.Exec(`UPDATE gold_items SET status = ? WHERE id = ?`, status, id)
	return err
}
