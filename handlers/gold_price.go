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
        SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price
        FROM gold_prices WHERE date = ?
        ORDER BY id DESC LIMIT 1
    `, today).Scan(&gp.ID, &gp.Date, &gp.UpdateTime, &gp.BuyPricePerBaht, &gp.SellPricePerBaht, &gp.OmBuyPrice, &gp.OmSellPrice)

	if err == nil {
		return gp, nil // Cache hit!
	}
	if err != sql.ErrNoRows {
		return gp, fmt.Errorf("query today price: %w", err)
	}

	// 2. Cache miss -> Primary Strategy: Fetch from the clean JSON API
	barBuy, barSell, omBuy, omSell, updateTime, err := h.fetchPricesFromAPI()
	if err != nil {
		// API Failed? -> Secondary Strategy: Native local scraper execution
		barBuy, barSell, omBuy, omSell, updateTime, err = h.scrapeGoldTradersWebsite()
	}

	// 3. If either API or Scraper succeeded, write back to local cache
	if err == nil && barBuy > 0 && barSell > 0 {
		res, insertErr := db.DB.Exec(`
            INSERT INTO gold_prices (date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(update_time) DO NOTHING
        `, today, updateTime, barBuy, barSell, omBuy, omSell)
		if insertErr == nil {
			id, _ := res.LastInsertId()
			return models.GoldPrice{
				ID:               int(id),
				Date:             today,
				UpdateTime:       updateTime,
				BuyPricePerBaht:  barBuy,
				SellPricePerBaht: barSell,
				OmBuyPrice:       omBuy,
				OmSellPrice:      omSell,
			}, nil
		}
	}

	// 4. TOTAL FAILSAFE: Internet completely down? Fetch the last known historical price
	var latestGp models.GoldPrice
	err = db.DB.QueryRow(`
        SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price
        FROM gold_prices
        ORDER BY id DESC
        LIMIT 1
    `).Scan(&latestGp.ID, &latestGp.Date, &latestGp.UpdateTime, &latestGp.BuyPricePerBaht, &latestGp.SellPricePerBaht, &latestGp.OmBuyPrice, &latestGp.OmSellPrice)

	if err == nil {
		return latestGp, nil
	}

	// Hard ceiling: Absolute baseline return if system database is brand new
	// 4. ABSOLUTE LAST RESORT -> Complete fallback to 0.0 if the DB is completely empty
    return models.GoldPrice{
        ID:               0,
        Date:             today,
        UpdateTime:       "MANUAL",
        BuyPricePerBaht:  0.0,
        SellPricePerBaht: 0.0,
        OmBuyPrice:       0.0,
        OmSellPrice:      0.0,
    }, nil
}
// fetchAndSaveLatest reaches out to the API (or scraper) and saves to the DB unconditionally.
func (h *GoldPriceHandler) fetchAndSaveLatest() {
	today := time.Now().Format("2006-01-02")
	
	barBuy, barSell, omBuy, omSell, updateTime, err := h.fetchPricesFromAPI()
	if err != nil {
		barBuy, barSell, omBuy, omSell, updateTime, err = h.scrapeGoldTradersWebsite()
	}

	if err == nil && barBuy > 0 && barSell > 0 {
		db.DB.Exec(`
			INSERT INTO gold_prices (date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(update_time) DO NOTHING
		`, today, updateTime, barBuy, barSell, omBuy, omSell)
	}
}

// StartPolling starts a background worker that fetches prices continuously
func (h *GoldPriceHandler) StartPolling(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		// Run once immediately on startup
		h.fetchAndSaveLatest()
		for {
			select {
			case <-h.ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				h.fetchAndSaveLatest()
			}
		}
	}()
}

// GetPriceHistory returns the last n days of gold prices, newest first.
func (h *GoldPriceHandler) GetPriceHistory(days int) ([]models.GoldPrice, error) {
	if days <= 0 {
		days = 30
	}
	rows, err := db.DB.Query(`
		SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price
		FROM gold_prices
		ORDER BY id DESC
		LIMIT ?
	`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.GoldPrice
	for rows.Next() {
		var gp models.GoldPrice
		if err := rows.Scan(&gp.ID, &gp.Date, &gp.UpdateTime, &gp.BuyPricePerBaht, &gp.SellPricePerBaht, &gp.OmBuyPrice, &gp.OmSellPrice); err != nil {
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
