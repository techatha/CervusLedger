package handlers

import (
	"context"
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
		goldItemID = int(id) // Not strictly needed anymore if not inserting into sales, but kept for logic

	default:
		return models.Sale{}, fmt.Errorf("ประเภทไม่ถูกต้อง: %s", input.Type)
	}

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

	// Just return an empty sale since the sales table is gone
	return models.Sale{}, nil
}
