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

// ---------------------------------------------------------------------------
// gold_stock CRUD
// ---------------------------------------------------------------------------

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
	_, err := db.DB.Exec(`DELETE FROM gold_stock_logs WHERE gold_item_id = ?`, id)
	if err != nil {
		return err
	}
	_, err = db.DB.Exec(`DELETE FROM gold_stock WHERE id = ?`, id)
	return err
}

// ---------------------------------------------------------------------------
// gold_stock_logs CRUD
// ---------------------------------------------------------------------------

func (h *GoldItemHandler) ListStockLogs(logDate string) ([]models.GoldStockLog, error) {
	var query string
	var args []interface{}

	if logDate == "" {
		query = `
			SELECT 
				l.id,
				l.gold_item_id,
				g.type,
				g.subtype,
				l.amount,
				l.log_date,
				l.created_at
			FROM gold_stock_logs l
			JOIN gold_stock g ON l.gold_item_id = g.id
			ORDER BY l.log_date DESC, g.type ASC, g.subtype ASC
		`
	} else {
		// Standardize the date input
		if len(logDate) == 10 {
			logDate = logDate + " 00:00:00"
		} else if len(logDate) > 10 {
			logDate = logDate[:10] + " 00:00:00"
		}

		query = `
			SELECT 
				l.id,
				l.gold_item_id,
				g.type,
				g.subtype,
				l.amount,
				l.log_date,
				l.created_at
			FROM gold_stock_logs l
			JOIN gold_stock g ON l.gold_item_id = g.id
			WHERE date(l.log_date) = date(?)
			ORDER BY g.type ASC, g.subtype ASC
		`
		args = append(args, logDate)
	}

	rows, err := db.DB.Query(query, args...)
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
	
	if logs == nil {
		return []models.GoldStockLog{}, nil
	}
	
	return logs, nil
}

func (h *GoldItemHandler) RecordStockLog(input models.GoldStockLogInput) error {
	logDate := input.LogDate
	if len(logDate) == 10 {
		logDate = logDate + " 00:00:00"
	} else if len(logDate) > 10 {
		logDate = logDate[:10] + " 00:00:00"
	}
	_, err := db.DB.Exec(`
		INSERT INTO gold_stock_logs (gold_item_id, amount, log_date)
		VALUES (?, ?, ?)
		ON CONFLICT(gold_item_id, log_date) DO UPDATE SET amount = excluded.amount
	`, input.GoldItemID, input.Amount, logDate)
	return err
}

func (h *GoldItemHandler) GetStockLog(id int) (models.GoldStockLog, error) {
	var l models.GoldStockLog
	err := db.DB.QueryRow(`
		SELECT 
			l.id, l.gold_item_id, g.type, g.subtype,
			l.amount, l.log_date, l.created_at
		FROM gold_stock_logs l
		JOIN gold_stock g ON l.gold_item_id = g.id
		WHERE l.id = ?
	`, id).Scan(
		&l.ID, &l.GoldItemID, &l.Type, &l.Subtype,
		&l.Amount, &l.LogDate, &l.CreatedAt,
	)
	if err != nil {
		return l, fmt.Errorf("get stock log %d: %w", id, err)
	}
	return l, nil
}

func (h *GoldItemHandler) UpdateStockLog(id int, input models.GoldStockLogInput) error {
	logDate := input.LogDate
	if len(logDate) == 10 {
		logDate = logDate + " 00:00:00"
	} else if len(logDate) > 10 {
		logDate = logDate[:10] + " 00:00:00"
	}
	_, err := db.DB.Exec(`
		UPDATE gold_stock_logs
		SET gold_item_id = ?, amount = ?, log_date = ?
		WHERE id = ?
	`, input.GoldItemID, input.Amount, logDate, id)
	if err != nil {
		return fmt.Errorf("update stock log %d: %w", id, err)
	}
	return nil
}

func (h *GoldItemHandler) DeleteStockLog(id int) error {
	_, err := db.DB.Exec(`DELETE FROM gold_stock_logs WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete stock log %d: %w", id, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Other handlers
// ---------------------------------------------------------------------------

// SetGoldItemStatus is deprecated but kept for backwards compatibility.
func (h *GoldItemHandler) SetGoldItemStatus(id int, status string) error {
	return nil
}

func (h *GoldItemHandler) GetGoldMainTypes() ([]string, error) {
	query := `
		SELECT DISTINCT type
		FROM gold_stock
		WHERE type IS NOT NULL AND type != ''
		ORDER BY type ASC
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("get gold main types: %w", err)
	}
	defer rows.Close()

	var types []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, fmt.Errorf("scan gold main type: %w", err)
		}
		types = append(types, t)
	}
	if types == nil {
		return []string{}, nil
	}
	return types, nil
}

func (h *GoldItemHandler) GetGoldSubtypes(mainType string) ([]string, error) {
	var query string
	var args []interface{}
	if mainType != "" {
		query = `
			SELECT DISTINCT subtype
			FROM gold_stock
			WHERE type = ? AND subtype IS NOT NULL AND subtype != ''
			ORDER BY subtype ASC
		`
		args = append(args, mainType)
	} else {
		query = `
			SELECT DISTINCT subtype
			FROM gold_stock
			WHERE subtype IS NOT NULL AND subtype != ''
			ORDER BY subtype ASC
		`
	}

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("get gold subtypes: %w", err)
	}
	defer rows.Close()

	var subtypes []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, fmt.Errorf("scan gold subtype: %w", err)
		}
		subtypes = append(subtypes, s)
	}
	if subtypes == nil {
		return []string{}, nil
	}
	return subtypes, nil
}

