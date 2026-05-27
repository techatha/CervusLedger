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

func NewGoldItemHandler() *GoldItemHandler {
	return &GoldItemHandler{}
}

func (h *GoldItemHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *GoldItemHandler) ListGoldItems(status string) ([]models.GoldItem, error) {
	query := `
		SELECT id, type, subtype, purity, weight_grams, created_at
		FROM gold_stock
		ORDER BY type ASC, subtype ASC
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("list gold stock: %w", err)
	}
	defer rows.Close()

	var items []models.GoldItem
	for rows.Next() {
		var g models.GoldItem
		if err := rows.Scan(
			&g.ID, &g.Type, &g.Subtype, &g.Purity, &g.WeightGrams, &g.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan gold stock: %w", err)
		}
		items = append(items, g)
	}
	return items, nil
}

func (h *GoldItemHandler) GetGoldItem(id int) (models.GoldItem, error) {
	var g models.GoldItem
	err := db.DB.QueryRow(`
		SELECT id, type, subtype, purity, weight_grams, created_at
		FROM gold_stock WHERE id = ?
	`, id).Scan(
		&g.ID, &g.Type, &g.Subtype, &g.Purity, &g.WeightGrams, &g.CreatedAt,
	)
	if err != nil {
		return g, fmt.Errorf("get gold stock %d: %w", id, err)
	}
	return g, nil
}

func (h *GoldItemHandler) CreateGoldItem(input models.GoldItemInput) (models.GoldItem, error) {
	res, err := db.DB.Exec(`
		INSERT INTO gold_stock (type, subtype, purity, weight_grams)
		VALUES (?, ?, ?, ?)
	`, input.Type, input.Subtype, input.Purity, input.WeightGrams)
	if err != nil {
		return models.GoldItem{}, fmt.Errorf("create gold stock: %w", err)
	}
	id, _ := res.LastInsertId()
	return h.GetGoldItem(int(id))
}

func (h *GoldItemHandler) UpdateGoldItem(input models.GoldItemInput) error {
	_, err := db.DB.Exec(`
		UPDATE gold_stock
		SET type = ?, subtype = ?, purity = ?, weight_grams = ?
		WHERE id = ?
	`, input.Type, input.Subtype, input.Purity, input.WeightGrams, input.ID)
	return err
}

func (h *GoldItemHandler) DeleteGoldItem(id int) error {
	_, err := db.DB.Exec(`DELETE FROM gold_stock WHERE id = ?`, id)
	return err
}

func (h *GoldItemHandler) ListStockLogs(logDate string) ([]models.GoldStockLog, error) {
	query := `
		SELECT 
			COALESCE(l.id, 0) as log_id,
			g.id as gold_item_id,
			g.type,
			g.subtype,
			COALESCE(l.amount, 0) as amount,
			COALESCE(l.log_date, ?) as log_date,
			COALESCE(l.created_at, '') as created_at
		FROM gold_stock g
		LEFT JOIN gold_stock_logs l ON g.id = l.gold_item_id AND l.log_date = ?
		ORDER BY g.type ASC, g.subtype ASC
	`
	rows, err := db.DB.Query(query, logDate, logDate)
	if err != nil {
		return nil, fmt.Errorf("list stock logs: %w", err)
	}
	defer rows.Close()

	var logs []models.GoldStockLog
	for rows.Next() {
		var l models.GoldStockLog
		if err := rows.Scan(
			&l.ID, &l.GoldItemID, &l.Type, &l.Subtype,
			&l.Amount, &l.LogDate, &l.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan stock log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (h *GoldItemHandler) RecordStockLog(input models.GoldStockLogInput) error {
	_, err := db.DB.Exec(`
		INSERT INTO gold_stock_logs (gold_item_id, amount, log_date)
		VALUES (?, ?, ?)
		ON CONFLICT(gold_item_id, log_date) DO UPDATE SET amount = excluded.amount
	`, input.GoldItemID, input.Amount, input.LogDate)
	return err
}

// SetGoldItemStatus is deprecated but kept for backwards compatibility.
func (h *GoldItemHandler) SetGoldItemStatus(id int, status string) error {
	return nil
}
