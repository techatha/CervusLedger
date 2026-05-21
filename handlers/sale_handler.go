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
		var count int
		err := tx.QueryRow("SELECT COUNT(1) FROM gold_items WHERE id = ?", goldItemID).Scan(&count)
		if err != nil || count == 0 {
			return models.Sale{}, fmt.Errorf("ไม่พบรายการทองนี้ในระบบ")
		}

	case "buy":
		if input.CustomerID == 0 {
			return models.Sale{}, fmt.Errorf("ต้องระบุลูกค้าสำหรับการรับซื้อทอง")
		}
		// Find existing SKU, or create a new SKU if it doesn't exist (no purity checking)
		err = tx.QueryRow(`
			SELECT id FROM gold_items 
			WHERE type = ? AND weight_baht = ?
			LIMIT 1
		`, input.ItemType, input.WeightBaht).Scan(&goldItemID)
		if err != nil {
			// Insert new SKU in gold_items catalog
			resInsert, err := tx.Exec(`
				INSERT INTO gold_items (type, weight_baht)
				VALUES (?, ?)
			`, input.ItemType, input.WeightBaht)
			if err != nil {
				return models.Sale{}, fmt.Errorf("insert new gold item from buy: %w", err)
			}
			id, _ := resInsert.LastInsertId()
			goldItemID = int(id)
		}

		// Insert record into purchased_gold ledger
		_, err = tx.Exec(`
			INSERT INTO purchased_gold (customer_id, type, weight_baht, total_amount, notes, date, is_inventory, still_exists)
			VALUES (?, ?, ?, ?, ?, ?, ?, 1)
		`, input.CustomerID, input.ItemType, input.WeightBaht, input.TotalAmount, input.Notes, input.Date, input.IsInventory)
		if err != nil {
			return models.Sale{}, fmt.Errorf("insert purchased_gold: %w", err)
		}

		// If user checked "Enter as gold stock", increment the monthly log amount
		if input.IsInventory == 1 {
			var logDate string
			if len(input.Date) >= 7 {
				logDate = input.Date[:7] + "-01"
			} else {
				logDate = "2026-05-01"
			}
			_, err = tx.Exec(`
				INSERT INTO gold_stock_logs (gold_item_id, amount, log_date)
				VALUES (?, 1, ?)
				ON CONFLICT(gold_item_id, log_date) DO UPDATE SET amount = amount + 1
			`, goldItemID, logDate)
			if err != nil {
				return models.Sale{}, fmt.Errorf("increment stock log from buy: %w", err)
			}
		}

	case "discount":
		// Do nothing to gold_items for discounts

	default:
		return models.Sale{}, fmt.Errorf("ประเภทไม่ถูกต้อง: %s", input.Type)
	}

	// Auto-log income / expense
	incType, incCat := "income", "ขายทอง"
	if input.Type == "buy" {
		incType, incCat = "expense", "รับซื้อทอง"
	} else if input.Type == "discount" {
		incType, incCat = "expense", "ส่วนลด"
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

func (h *SaleHandler) GetSetting(key string) (string, error) {
	var val string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = ?`, key).Scan(&val)
	if err != nil {
		return "", err
	}
	return val, nil
}
