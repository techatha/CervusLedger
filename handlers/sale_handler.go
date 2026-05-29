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
		err := tx.QueryRow("SELECT COUNT(1) FROM gold_stock WHERE id = ?", goldItemID).Scan(&count)
		if err != nil || count == 0 {
			return models.Sale{}, fmt.Errorf("ไม่พบรายการทองนี้ในระบบ")
		}

	case "buy":
		if input.CustomerID == 0 {
			return models.Sale{}, fmt.Errorf("ต้องระบุลูกค้าสำหรับการรับซื้อทอง")
		}
		// Find existing SKU, or create a new SKU if it doesn't exist
		err = tx.QueryRow(`
			SELECT id FROM gold_stock 
			WHERE type = ? AND subtype = ?
			LIMIT 1
		`, input.ItemType, input.ItemSubtype).Scan(&goldItemID)
		if err != nil {
			// Insert new SKU in gold_stock catalog with defaults (96.5% and estimated grams)
			estGrams := input.WeightBaht * 15.16
			resInsert, err := tx.Exec(`
				INSERT INTO gold_stock (type, subtype, purity, weight_grams)
				VALUES (?, ?, '96.5', ?)
			`, input.ItemType, input.ItemSubtype, estGrams)
			if err != nil {
				return models.Sale{}, fmt.Errorf("insert new gold stock from buy: %w", err)
			}
			id, _ := resInsert.LastInsertId()
			goldItemID = int(id)
		}

		// Insert record into purchased_gold ledger
		_, err = tx.Exec(`
			INSERT INTO purchased_gold (customer_id, type, subtype, weight_baht, weight_grams, total_amount, notes, date, is_inventory, still_exists)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
		`, input.CustomerID, input.ItemType, input.ItemSubtype, input.WeightBaht, input.WeightGrams, input.TotalAmount, input.Notes, input.Date, input.IsInventory)
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
		// Do nothing to gold_stock for discounts

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
