package handlers

import (
	"CervusLedger/db"
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"CervusLedger/models"
)

// GetTodayPrice returns today's gold_prices row.
// If none exists, it reads buy/sell from settings and inserts a row.
// GetTodayPrice handles the indestructible 4-step failover workflow
func (h *GoldPriceHandler) GetTodayPrice() (models.GoldPrice, error) {
	today := time.Now().Format("2006-01-02")

	// 1. Check if we already fetched/saved today's price in our DB
	var gp models.GoldPrice
	err := db.DB.QueryRow(`
        SELECT id, date, buy_price_per_baht, sell_price_per_baht
        FROM gold_prices WHERE date = ?
    `, today).Scan(&gp.ID, &gp.Date, &gp.BuyPricePerBaht, &gp.SellPricePerBaht)

	if err == nil {
		return gp, nil // Cache hit!
	}
	if err != sql.ErrNoRows {
		return gp, fmt.Errorf("query today price: %w", err)
	}

	// 2. Cache miss -> Primary Strategy: Fetch from the clean JSON API
	buy, sell, err := h.fetchPricesFromAPI()
	if err != nil {
		// API Failed? -> Secondary Strategy: Native local scraper execution
		buy, sell, err = h.scrapeGoldTradersWebsite()
	}

	// 3. If either API or Scraper succeeded, write back to local cache
	if err == nil && buy > 0 && sell > 0 {
		res, insertErr := db.DB.Exec(`
            INSERT INTO gold_prices (date, buy_price_per_baht, sell_price_per_baht)
            VALUES (?, ?, ?)
        `, today, buy, sell)
		if insertErr == nil {
			id, _ := res.LastInsertId()
			return models.GoldPrice{
				ID:               int(id),
				Date:             today,
				BuyPricePerBaht:  buy,
				SellPricePerBaht: sell,
			}, nil
		}
	}

	// 4. TOTAL FAILSAFE: Internet completely down? Fetch the last known historical price
	var latestGp models.GoldPrice
	err = db.DB.QueryRow(`
        SELECT id, date, buy_price_per_baht, sell_price_per_baht
        FROM gold_prices
        ORDER BY date DESC
        LIMIT 1
    `).Scan(&latestGp.ID, &latestGp.Date, &latestGp.BuyPricePerBaht, &latestGp.SellPricePerBaht)

	if err == nil {
		return latestGp, nil
	}

	// Hard ceiling: Absolute baseline return if system database is brand new
	// 4. ABSOLUTE LAST RESORT -> Complete fallback to 0.0 if the DB is completely empty
    return models.GoldPrice{
        ID:               0,
        Date:             today,
        BuyPricePerBaht:  0.0,
        SellPricePerBaht: 0.0,
    }, nil
}

// UpsertTodayPrice sets (or updates) today's buy and sell prices.
// Also syncs the settings table so the app defaults stay current.
func (h *GoldPriceHandler) UpsertTodayPrice(buy, sell float64) error {
	today := time.Now().Format("2006-01-02")

	_, err := db.DB.Exec(`
		INSERT INTO gold_prices (date, buy_price_per_baht, sell_price_per_baht)
		VALUES (?, ?, ?)
		ON CONFLICT(date) DO UPDATE SET
		  buy_price_per_baht  = excluded.buy_price_per_baht,
		  sell_price_per_baht = excluded.sell_price_per_baht
	`, today, buy, sell)
	if err != nil {
		return fmt.Errorf("upsert gold price: %w", err)
	}

	// Keep settings in sync
	// db.DB.Exec(`UPDATE settings SET value = ? WHERE key = 'buy_price_per_baht'`, strconv.FormatFloat(buy, 'f', 2, 64))
	// db.DB.Exec(`UPDATE settings SET value = ? WHERE key = 'sell_price_per_baht'`, strconv.FormatFloat(sell, 'f', 2, 64))
	return nil
}

// GetPriceHistory returns the last n days of gold prices, newest first.
func (h *GoldPriceHandler) GetPriceHistory(days int) ([]models.GoldPrice, error) {
	if days <= 0 {
		days = 30
	}
	rows, err := db.DB.Query(`
		SELECT id, date, buy_price_per_baht, sell_price_per_baht
		FROM gold_prices
		ORDER BY date DESC
		LIMIT ?
	`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.GoldPrice
	for rows.Next() {
		var gp models.GoldPrice
		if err := rows.Scan(&gp.ID, &gp.Date, &gp.BuyPricePerBaht, &gp.SellPricePerBaht); err != nil {
			return nil, err
		}
		list = append(list, gp)
	}
	return list, nil
}

// settingsGoldPrices reads buy/sell defaults from the settings table.
func (h *GoldPriceHandler) settingsGoldPrices() (buy, sell float64) {
	buy, sell = 0, 0
	rows, _ := db.DB.Query(`SELECT key, value FROM settings WHERE key IN ('buy_price_per_baht','sell_price_per_baht')`)
	if rows == nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var k, v string
		rows.Scan(&k, &v)
		f, _ := strconv.ParseFloat(v, 64)
		if k == "buy_price_per_baht" {
			buy = f
		} else {
			sell = f
		}
	}
	return
}
