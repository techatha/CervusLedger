package gold_price_handler

import (
	"CervusLedger/db"
	"database/sql"
	"fmt"
	"regexp"
	"strconv"
	"time"

	"CervusLedger/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var timeRegex = regexp.MustCompile(`\d{2}:\d{2}`)

func parseTimeToMinutes(tStr string) int {
	match := timeRegex.FindString(tStr)
	if match == "" {
		return 0
	}
	var h, m int
	fmt.Sscanf(match, "%d:%d", &h, &m)
	return h*60 + m
}

func (h *GoldPriceHandler) isPriceNewer(date string, newUpdateTime string) bool {
	var currentLatestTime string
	err := db.DB.QueryRow(`
		SELECT update_time FROM gold_prices
		WHERE date = ?
		ORDER BY id DESC LIMIT 1
	`, date).Scan(&currentLatestTime)
	if err == sql.ErrNoRows {
		return true // DB is empty for today, so any incoming price is newer!
	}
	if err != nil {
		return true
	}

	newMins := parseTimeToMinutes(newUpdateTime)
	currentMins := parseTimeToMinutes(currentLatestTime)
	return newMins > currentMins
}

func (h *GoldPriceHandler) savePriceIfNewer(date, updateTime string, barBuy, barSell, omBuy, omSell float64) (models.GoldPrice, error) {
	if !h.isPriceNewer(date, updateTime) {
		// Update fetched_at for the stale record
		db.DB.Exec(`UPDATE gold_prices SET fetched_at = datetime('now', 'localtime') WHERE date = ? AND update_time = ?`, date, updateTime)

		// Stale data. Fetch the latest from DB to return
		var gp models.GoldPrice
		err := db.DB.QueryRow(`
			SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price, COALESCE(fetched_at, '')
			FROM gold_prices WHERE date = ?
			ORDER BY id DESC LIMIT 1
		`, date).Scan(&gp.ID, &gp.Date, &gp.UpdateTime, &gp.BuyPricePerBaht, &gp.SellPricePerBaht, &gp.OmBuyPrice, &gp.OmSellPrice, &gp.FetchedAt)
		if err == nil {
			return gp, nil
		}
	}

	res, err := db.DB.Exec(`
		INSERT INTO gold_prices (date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(update_time) DO NOTHING
	`, date, updateTime, barBuy, barSell, omBuy, omSell)
	if err != nil {
		return models.GoldPrice{}, err
	}
	id, _ := res.LastInsertId()

	if id == 0 {
		var gp models.GoldPrice
		err = db.DB.QueryRow(`
			SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price, COALESCE(fetched_at, '')
			FROM gold_prices WHERE date = ? AND update_time = ?
		`, date, updateTime).Scan(&gp.ID, &gp.Date, &gp.UpdateTime, &gp.BuyPricePerBaht, &gp.SellPricePerBaht, &gp.OmBuyPrice, &gp.OmSellPrice, &gp.FetchedAt)
		if err == nil {
			return gp, nil
		}
	}

	gp := models.GoldPrice{
		ID:               int(id),
		Date:             date,
		UpdateTime:       updateTime,
		BuyPricePerBaht:  barBuy,
		SellPricePerBaht: barSell,
		OmBuyPrice:       omBuy,
		OmSellPrice:      omSell,
		FetchedAt:        time.Now().Format("2006-01-02 15:04:05"),
	}

	if h.ctx != nil {
		runtime.EventsEmit(h.ctx, "gold-price:updated", gp)
	}

	return gp, nil
}

// GetTodayPrice returns today's gold_prices row.
// If none exists, it reads buy/sell from settings and inserts a row.
// GetTodayPrice handles the indestructible 4-step failover workflow
func (h *GoldPriceHandler) GetTodayPrice() (models.GoldPrice, error) {
	today := time.Now().Format("2006-01-02")

	// 1. Check if we already fetched/saved today's price in our DB
	var gp models.GoldPrice
	err := db.DB.QueryRow(`
        SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price, COALESCE(fetched_at, '')
        FROM gold_prices WHERE date = ?
        ORDER BY id DESC LIMIT 1
    `, today).Scan(&gp.ID, &gp.Date, &gp.UpdateTime, &gp.BuyPricePerBaht, &gp.SellPricePerBaht, &gp.OmBuyPrice, &gp.OmSellPrice, &gp.FetchedAt)

	if err == nil {
		return gp, nil // Cache hit!
	}
	if err != sql.ErrNoRows {
		return gp, fmt.Errorf("query today price: %w", err)
	}

	// 2. Cache miss -> Primary Strategy: Scraper
	barBuy, barSell, omBuy, omSell, date, updateTime, err := h.scrapeGoldTradersWebsite()
	if err != nil {
		// Scraper Failed? -> Secondary Strategy: Fetch from the JSON API
		barBuy, barSell, omBuy, omSell, date, updateTime, err = h.fetchPricesFromAPI()
	}

	// 3. If either API or Scraper succeeded, write back to local cache
	if err == nil && barBuy > 0 && barSell > 0 {
		return h.savePriceIfNewer(date, updateTime, barBuy, barSell, omBuy, omSell)
	}

	// 4. TOTAL FAILSAFE: Internet completely down? Fetch the last known historical price
	var latestGp models.GoldPrice
	err = db.DB.QueryRow(`
        SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price, COALESCE(fetched_at, '')
        FROM gold_prices
        ORDER BY id DESC
        LIMIT 1
    `).Scan(&latestGp.ID, &latestGp.Date, &latestGp.UpdateTime, &latestGp.BuyPricePerBaht, &latestGp.SellPricePerBaht, &latestGp.OmBuyPrice, &latestGp.OmSellPrice, &latestGp.FetchedAt)

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
		FetchedAt:        time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// ForceScrapePrice triggers an immediate scrape of the website and returns it.
// Falls back to the JSON API if the scraper fails (e.g. Windows firewall/TLS issues).
func (h *GoldPriceHandler) ForceScrapePrice() (models.GoldPrice, error) {
	barBuy, barSell, omBuy, omSell, date, updateTime, err := h.scrapeGoldTradersWebsite()
	if err != nil {
		// Fallback to JSON API (mirrors GetTodayPrice / fetchAndSaveLatest)
		barBuy, barSell, omBuy, omSell, date, updateTime, err = h.fetchPricesFromAPI()
	}
	if err != nil {
		return models.GoldPrice{}, fmt.Errorf("force scrape failed (scraper + api): %w", err)
	}
	return h.savePriceIfNewer(date, updateTime, barBuy, barSell, omBuy, omSell)
}

// fetchAndSaveLatest reaches out to the API (or scraper) and saves to the DB unconditionally if newer.
func (h *GoldPriceHandler) fetchAndSaveLatest() {
	barBuy, barSell, omBuy, omSell, date, updateTime, err := h.scrapeGoldTradersWebsite()
	if err != nil {
		barBuy, barSell, omBuy, omSell, date, updateTime, err = h.fetchPricesFromAPI()
	}

	if err == nil && barBuy > 0 && barSell > 0 {
		_, _ = h.savePriceIfNewer(date, updateTime, barBuy, barSell, omBuy, omSell)
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
		SELECT id, date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price, COALESCE(fetched_at, '')
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
		if err := rows.Scan(&gp.ID, &gp.Date, &gp.UpdateTime, &gp.BuyPricePerBaht, &gp.SellPricePerBaht, &gp.OmBuyPrice, &gp.OmSellPrice, &gp.FetchedAt); err != nil {
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

// UpsertTodayPrice sets (or updates) today's buy and sell prices.
func (h *GoldPriceHandler) UpsertTodayPrice(buy, sell float64) error {
	today := time.Now().Format("2006-01-02")
	updateTime := fmt.Sprintf("Manual %s", time.Now().Format("15:04:05"))

	_, err := db.DB.Exec(`
		INSERT INTO gold_prices (date, update_time, buy_price_per_baht, sell_price_per_baht, om_buy_price, om_sell_price)
		VALUES (?, ?, ?, ?, ?, ?)
	`, today, updateTime, buy, sell, buy, sell)
	if err != nil {
		return fmt.Errorf("upsert gold price: %w", err)
	}

	return nil
}
