package handlers

import (
	"context"
	"database/sql"
	"fmt"

	"CervusLedger/db"
	"CervusLedger/models"
)

type SaleHandler struct {
	ctx context.Context
}

func NewSaleHandler() *SaleHandler {
	return &SaleHandler{}
}

func (h *SaleHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

// CreateSale handles both buy and sell in one transaction:
//   - sell: marks existing gold_item as sold, inserts sale row, logs income
//   - buy:  inserts new gold_item as available, inserts sale row, logs expense
func (h *SaleHandler) CreateSale(input models.SaleInput) (models.Sale, error) {
	tx, err := db.DB.Begin()
	if err != nil {
		return models.Sale{}, err
	}
	defer tx.Rollback()

	goldItemID := input.GoldItemID

	switch input.Type {
	case "sell":
		if goldItemID == 0 {
			return models.Sale{}, fmt.Errorf("ต้องระบุรายการทองที่จะขาย")
		}
		// Mark the item sold
		res, err := tx.Exec(
			`UPDATE gold_items SET status = 'sold' WHERE id = ? AND status = 'available'`,
			goldItemID,
		)
		if err != nil {
			return models.Sale{}, fmt.Errorf("mark sold: %w", err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return models.Sale{}, fmt.Errorf("รายการทองนี้ไม่พร้อมขาย หรือถูกขายไปแล้ว")
		}

	case "buy":
		// Create a new gold_item from this purchase
		res, err := tx.Exec(`
			INSERT INTO gold_items (type, weight_baht, purity, description, status)
			VALUES (?, ?, ?, ?, 'available')
		`, input.ItemType, input.WeightBaht, input.Purity, input.Description)
		if err != nil {
			return models.Sale{}, fmt.Errorf("create gold item from buy: %w", err)
		}
		id, _ := res.LastInsertId()
		goldItemID = int(id)

	default:
		return models.Sale{}, fmt.Errorf("ประเภทไม่ถูกต้อง: %s", input.Type)
	}

	// Nullable customer_id
	var custID interface{} = nil
	if input.CustomerID != 0 {
		custID = input.CustomerID
	}

	// Insert sale row
	saleRes, err := tx.Exec(`
		INSERT INTO sales
		  (customer_id, gold_item_id, type, weight_baht,
		   gold_price_id, total_amount, notes, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		custID, goldItemID, input.Type, input.WeightBaht,
		input.GoldPriceID, input.TotalAmount, input.Notes, input.Date,
	)
	if err != nil {
		return models.Sale{}, fmt.Errorf("insert sale: %w", err)
	}
	saleID, _ := saleRes.LastInsertId()

	// Auto-log income / expense
	incType, incCat := "income", "ขายทอง"
	if input.Type == "buy" {
		incType, incCat = "expense", "รับซื้อทอง"
	}
	_, err = tx.Exec(`
		INSERT INTO income_expense (type, category, amount, notes, source, date)
		VALUES (?, ?, ?, ?, 'auto', ?)
	`, incType, incCat, input.TotalAmount, input.Notes, input.Date)
	if err != nil {
		return models.Sale{}, fmt.Errorf("auto income_expense: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return models.Sale{}, err
	}

	return h.GetSale(int(saleID))
}

// GetSale returns a single sale with joined customer name and gold item type.
func (h *SaleHandler) GetSale(id int) (models.Sale, error) {
	var s models.Sale
	var custID sql.NullInt64
	var custName, itemType sql.NullString

	err := db.DB.QueryRow(`
		SELECT
			s.id,
			s.customer_id,
			COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, '') AS customer_name,
			s.gold_item_id,
			COALESCE(g.type, '') AS gold_item_type,
			s.type, s.weight_baht, s.gold_price_id, s.total_amount, s.notes,
			DATE(s.created_at) AS date, s.created_at
		FROM sales s
		LEFT JOIN customers c ON c.id = s.customer_id
		LEFT JOIN gold_items g ON g.id = s.gold_item_id
		WHERE s.id = ?
	`, id).Scan(
		&s.ID, &custID, &custName,
		&s.GoldItemID, &itemType,
		&s.Type, &s.WeightBaht, &s.GoldPriceID, &s.TotalAmount, &s.Notes,
		&s.Date, &s.CreatedAt,
	)
	if err != nil {
		return s, fmt.Errorf("get sale %d: %w", id, err)
	}
	if custID.Valid {
		s.CustomerID = int(custID.Int64)
	}
	s.CustomerName = custName.String
	s.GoldItemType = itemType.String
	return s, nil
}

// ListSales returns all sales, optionally filtered by type ("buy"/"sell"/"").
func (h *SaleHandler) ListSales(saleType string) ([]models.Sale, error) {
	query := `
		SELECT
			s.id,
			s.customer_id,
			COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, '') AS customer_name,
			COALESCE(s.gold_item_id, 0),
			COALESCE(g.type, '') AS gold_item_type,
			s.type, s.weight_baht, s.gold_price_id, s.total_amount, s.notes,
			DATE(s.created_at) AS date, s.created_at
		FROM sales s
		LEFT JOIN customers c ON c.id = s.customer_id
		LEFT JOIN gold_items g ON g.id = s.gold_item_id
		WHERE 1=1
	`
	args := []interface{}{}
	if saleType != "" {
		query += ` AND s.type = ?`
		args = append(args, saleType)
	}
	query += ` ORDER BY s.created_at DESC`

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list sales: %w", err)
	}
	defer rows.Close()

	var list []models.Sale
	for rows.Next() {
		var s models.Sale
		var custID sql.NullInt64
		var custName, itemType sql.NullString

		if err := rows.Scan(
			&s.ID, &custID, &custName,
			&s.GoldItemID, &itemType,
			&s.Type, &s.WeightBaht, &s.GoldPriceID, &s.TotalAmount, &s.Notes,
			&s.Date, &s.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan sale: %w", err)
		}
		if custID.Valid {
			s.CustomerID = int(custID.Int64)
		}
		s.CustomerName = custName.String
		s.GoldItemType = itemType.String
		list = append(list, s)
	}
	return list, nil
}
