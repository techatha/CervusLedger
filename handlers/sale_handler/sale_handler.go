package sale_handler

import (
	"context"
	"fmt"
	"time"

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

		// Decrement stock log for the sold item
		var logDate string
		if len(input.Date) >= 10 {
			logDate = input.Date[:10] + " 00:00:00"
		} else {
			logDate = time.Now().Format(time.DateOnly) + " 00:00:00"
		}

		var currentAmount int
		err = tx.QueryRow(`
			SELECT amount FROM gold_stock_logs 
			WHERE gold_item_id = ? AND log_date = ?
		`, goldItemID, logDate).Scan(&currentAmount)
		if err == nil {
			_, err = tx.Exec(`
				UPDATE gold_stock_logs SET amount = amount - 1
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
			`, goldItemID, latestAmount - 1, logDate)
		}
		if err != nil {
			return models.Sale{}, fmt.Errorf("decrement stock log from sell: %w", err)
		}

	case "buy":
		if input.CustomerID == 0 {
			return models.Sale{}, fmt.Errorf("ต้องระบุลูกค้าสำหรับการรับซื้อทอง")
		}

		dateVal := input.Date
		if dateVal == "" {
			dateVal = time.Now().Format("2006-01-02")
		}
		if len(dateVal) == 10 {
			dateVal = dateVal + " " + time.Now().Format("15:04:05")
		}

		// Insert record into purchased_gold ledger
		_, err = tx.Exec(`
			INSERT INTO purchased_gold (customer_id, type, weight_grams, total_amount, notes, date, is_inventory, still_exists)
			VALUES (?, ?, ?, ?, ?, ?, ?, 1)
		`, input.CustomerID, input.ItemType, input.WeightGrams, input.TotalAmount, input.Notes, dateVal, input.IsInventory)
		if err != nil {
			return models.Sale{}, fmt.Errorf("insert purchased_gold: %w", err)
		}

		// If user checked "Enter as gold stock", increment the monthly log amount
		if input.IsInventory == 1 {
			if goldItemID == 0 && input.ItemType != "" && input.ItemSubtype != "" {
				err = tx.QueryRow(`
					SELECT id FROM gold_stock 
					WHERE type = ? AND subtype = ?
					LIMIT 1
				`, input.ItemType, input.ItemSubtype).Scan(&goldItemID)
				if err != nil {
					estGrams := input.WeightGrams
					if estGrams == 0 {
						estGrams = input.WeightBaht * 15.16
					}
					resInsert, err := tx.Exec(`
						INSERT INTO gold_stock (type, subtype, purity, weight_grams)
						VALUES (?, ?, '96.5', ?)
					`, input.ItemType, input.ItemSubtype, estGrams)
					if err != nil {
						return models.Sale{}, fmt.Errorf("insert fallback gold stock from buy: %w", err)
					}
					id, _ := resInsert.LastInsertId()
					goldItemID = int(id)
				}
			}

			if goldItemID > 0 {
				var logDate string
				if len(input.Date) >= 10 {
					logDate = input.Date[:10] + " 00:00:00"
				} else {
					logDate = time.Now().Format(time.RFC3339)[:10] + " 00:00:00"
				}

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
					return models.Sale{}, fmt.Errorf("increment stock log from buy: %w", err)
				}
			}
		}

	case "discount", "addition":
		// Do nothing to gold_stock for discounts or additions
		
	default:
		return models.Sale{}, fmt.Errorf("ประเภทไม่ถูกต้อง: %s", input.Type)
	}

	// Auto-log income / expense
	incType, incCat := "income", "ขายทอง"
	switch input.Type {
	case "buy":
		incType, incCat = "expense", "รับซื้อทอง"
	case "discount":
		incType, incCat = "expense", "ส่วนลด"
	case "addition":
		incType, incCat = "income", "รายรับอื่นๆ"
	}
	dateVal := input.Date
	if dateVal == "" {
		dateVal = time.Now().Format("2006-01-02")
	}
	if len(dateVal) == 10 {
		dateVal = dateVal + " " + time.Now().Format("15:04:05")
	}
	isBankInt := 0
	if input.IsBankTransfer {
		isBankInt = 1
	}
	_, err = tx.Exec(`
		INSERT INTO income_expenses (type, category, amount, notes, source, is_bank_transfer, date)
		VALUES (?, ?, ?, ?, 'auto', ?, ?)
	`, incType, incCat, input.TotalAmount, input.Notes, isBankInt, dateVal)
	if err != nil {
		return models.Sale{}, fmt.Errorf("auto income_expenses: %w", err)
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
