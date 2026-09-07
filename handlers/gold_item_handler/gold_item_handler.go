package gold_item_handler

import (
	"context"
	"database/sql"
	"fmt"
	"log"

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
		SELECT id, type, subtype, purity, weight_grams, no_purity, no_weight, created_at
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
			&g.ID, &g.Type, &g.Subtype, &g.Purity, &g.WeightGrams, &g.NoPurity, &g.NoWeight, &g.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan gold stock: %w", err)
		}
		items = append(items, g)
	}
	return items, nil
}

// ListGoldItemsWithStock returns gold catalog items enriched with
// latest_amount and a short recent_history (one entry per day, last 5 days).
// This is the primary endpoint for the GoldStockList page.
func (h *GoldItemHandler) ListGoldItemsWithStock() ([]models.GoldItemWithStock, error) {
	// 1. Load catalog items
	itemRows, err := db.DB.Query(`
		SELECT id, type, subtype, purity, weight_grams, no_purity, no_weight, created_at
		FROM gold_stock
		ORDER BY type ASC, subtype ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list gold stock: %w", err)
	}
	defer itemRows.Close()

	var results []models.GoldItemWithStock
	var itemIDs []int
	itemIndex := map[int]int{} // gold_item_id → index in results

	for itemRows.Next() {
		var g models.GoldItem
		if err := itemRows.Scan(
			&g.ID, &g.Type, &g.Subtype, &g.Purity, &g.WeightGrams, &g.NoPurity, &g.NoWeight, &g.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan gold stock: %w", err)
		}
		itemIndex[g.ID] = len(results)
		itemIDs = append(itemIDs, g.ID)
		results = append(results, models.GoldItemWithStock{
			GoldItem:      g,
			LatestAmount:  0,
			RecentHistory: []models.GoldStockLog{},
		})
	}

	if len(itemIDs) == 0 {
		return results, nil
	}

	// 2. For each item, get the latest amount
	for _, id := range itemIDs {
		latestAmount, err := db.GetLatestStockAmount(db.DB, id)
		if err == nil {
			idx := itemIndex[id]
			results[idx].LatestAmount = latestAmount
		}
	}

	// 3. For each item, get the last 5 deduplicated daily entries
	// (one per day = the entry with MAX(id) for that day)
	for _, id := range itemIDs {
		histRows, err := db.DB.Query(`
			SELECT l.id, l.gold_item_id, g.type, g.subtype, l.amount, l.created_at
			FROM gold_stock_logs l
			JOIN gold_stock g ON l.gold_item_id = g.id
			JOIN (
				SELECT MAX(id) as max_id
				FROM gold_stock_logs
				WHERE gold_item_id = ?
				GROUP BY date(created_at)
				ORDER BY date(created_at) DESC
				LIMIT 5
			) latest ON l.id = latest.max_id
			ORDER BY l.created_at ASC
		`, id)
		if err != nil {
			continue
		}

		idx := itemIndex[id]
		for histRows.Next() {
			var l models.GoldStockLog
			if err := histRows.Scan(
				&l.ID, &l.GoldItemID, &l.Type, &l.Subtype, &l.Amount, &l.CreatedAt,
			); err != nil {
				continue
			}
			results[idx].RecentHistory = append(results[idx].RecentHistory, l)
		}
		histRows.Close()
	}

	return results, nil
}

func (h *GoldItemHandler) GetGoldItem(id int) (models.GoldItem, error) {
	var g models.GoldItem
	err := db.DB.QueryRow(`
		SELECT id, type, subtype, purity, weight_grams, no_purity, no_weight, created_at
		FROM gold_stock WHERE id = ?
	`, id).Scan(
		&g.ID, &g.Type, &g.Subtype, &g.Purity, &g.WeightGrams, &g.NoPurity, &g.NoWeight, &g.CreatedAt,
	)
	if err != nil {
		return g, fmt.Errorf("get gold stock %d: %w", id, err)
	}
	return g, nil
}

func (h *GoldItemHandler) CreateGoldItem(input models.GoldItemInput) (models.GoldItem, error) {
	res, err := db.DB.Exec(`
		INSERT INTO gold_stock (type, subtype, purity, weight_grams, no_purity, no_weight)
		VALUES (?, ?, ?, ?, ?, ?)
	`, input.Type, input.Subtype, input.Purity, input.WeightGrams, input.NoPurity, input.NoWeight)
	if err != nil {
		return models.GoldItem{}, fmt.Errorf("create gold stock: %w", err)
	}
	id, _ := res.LastInsertId()
	return h.GetGoldItem(int(id))
}

func (h *GoldItemHandler) UpdateGoldItem(input models.GoldItemInput) error {
	_, err := db.DB.Exec(`
		UPDATE gold_stock
		SET type = ?, subtype = ?, purity = ?, weight_grams = ?, no_purity = ?, no_weight = ?
		WHERE id = ?
	`, input.Type, input.Subtype, input.Purity, input.WeightGrams, input.NoPurity, input.NoWeight, input.ID)
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
				l.created_at
			FROM gold_stock_logs l
			JOIN gold_stock g ON l.gold_item_id = g.id
			ORDER BY l.created_at DESC, g.type ASC, g.subtype ASC
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
				l.created_at
			FROM gold_stock_logs l
			JOIN gold_stock g ON l.gold_item_id = g.id
			JOIN (
				SELECT gold_item_id, MAX(id) as max_id
				FROM gold_stock_logs
				WHERE date(created_at) = date(?)
				GROUP BY gold_item_id
			) latest ON l.id = latest.max_id
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
			&l.Amount, &l.CreatedAt,
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
	_, err := db.DB.Exec(`
		INSERT INTO gold_stock_logs (gold_item_id, amount)
		VALUES (?, ?)
	`, input.GoldItemID, input.Amount)
	return err
}

func (h *GoldItemHandler) GetStockLog(id int) (models.GoldStockLog, error) {
	var l models.GoldStockLog
	err := db.DB.QueryRow(`
		SELECT 
			l.id, l.gold_item_id, g.type, g.subtype,
			l.amount, l.created_at
		FROM gold_stock_logs l
		JOIN gold_stock g ON l.gold_item_id = g.id
		WHERE l.id = ?
	`, id).Scan(
		&l.ID, &l.GoldItemID, &l.Type, &l.Subtype,
		&l.Amount, &l.CreatedAt,
	)
	if err != nil {
		return l, fmt.Errorf("get stock log %d: %w", id, err)
	}
	return l, nil
}

func (h *GoldItemHandler) UpdateStockLog(id int, input models.GoldStockLogInput) error {
	_, err := db.DB.Exec(`
		UPDATE gold_stock_logs
		SET gold_item_id = ?, amount = ?
		WHERE id = ?
	`, input.GoldItemID, input.Amount, id)
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

func (h *GoldItemHandler) GetMonthlyStockHistory(year int, month int) (map[int]map[int][]models.GoldStockLog, error) {
	monthPrefix := fmt.Sprintf("%04d-%02d", year, month)
	log.Printf("[GetMonthlyStockHistory] Fetching history for year=%d, month=%d (prefix=%s)", year, month, monthPrefix)
	
	query := `
		SELECT 
			l.id, l.gold_item_id, g.type, g.subtype,
			l.amount, l.created_at, l.transaction_id
		FROM gold_stock_logs l
		JOIN gold_stock g ON l.gold_item_id = g.id
		WHERE l.created_at LIKE ?
		ORDER BY l.created_at ASC, l.id ASC
	`
	rows, err := db.DB.Query(query, monthPrefix+"%")
	if err != nil {
		log.Printf("[GetMonthlyStockHistory] ERROR executing query: %v", err)
		return nil, fmt.Errorf("query monthly stock history: %w", err)
	}
	defer rows.Close()

	result := make(map[int]map[int][]models.GoldStockLog)
	totalLogs := 0

	for rows.Next() {
		var l models.GoldStockLog
		var txnID sql.NullString
		if err := rows.Scan(
			&l.ID, &l.GoldItemID, &l.Type, &l.Subtype,
			&l.Amount, &l.CreatedAt, &txnID,
		); err != nil {
			log.Printf("[GetMonthlyStockHistory] ERROR scanning row: %v", err)
			return nil, fmt.Errorf("scan history log: %w", err)
		}
		if txnID.Valid {
			l.TransactionID = txnID.String
		}

		if len(l.CreatedAt) >= 10 {
			dayStr := l.CreatedAt[8:10]
			var day int
			fmt.Sscanf(dayStr, "%d", &day)

			if result[l.GoldItemID] == nil {
				result[l.GoldItemID] = make(map[int][]models.GoldStockLog)
			}
			result[l.GoldItemID][day] = append(result[l.GoldItemID][day], l)
			totalLogs++
		}
	}

	log.Printf("[GetMonthlyStockHistory] Success: fetched %d logs across %d items for %s", totalLogs, len(result), monthPrefix)
	return result, nil
}
