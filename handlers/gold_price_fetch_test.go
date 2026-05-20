package handlers

import (
	"fmt"
	"testing"
)

// TestGoldPriceSources runs the API and Scraper directly to verify they work
func TestGoldPriceSources(t *testing.T) {
	h := NewGoldPriceHandler()

	// 1. Test the JSON API
	t.Run("Test API Endpoint", func(t *testing.T) {
		barBuy, barSell, omBuy, omSell, updateTime, err := h.fetchPricesFromAPI()
		if err != nil {
			t.Fatalf("API failed: %v", err)
		}
		fmt.Printf("✅ API Success! [%s] Bar Buy: %.2f | Bar Sell: %.2f | OM Buy: %.2f | OM Sell: %.2f\n", updateTime, barBuy, barSell, omBuy, omSell)
		if barBuy <= 0 || barSell <= 0 || omBuy <= 0 || omSell <= 0 || updateTime == "" {
			t.Errorf("API returned invalid prices/time: barBuy=%.2f, barSell=%.2f, omBuy=%.2f, omSell=%.2f, updateTime='%s'", barBuy, barSell, omBuy, omSell, updateTime)
		}
	})

	// 2. Test the Web Scraper
	t.Run("Test Web Scraper Backup", func(t *testing.T) {
		barBuy, barSell, omBuy, omSell, updateTime, err := h.scrapeGoldTradersWebsite()
		if err != nil {
			t.Fatalf("Scraper failed: %v", err)
		}
		fmt.Printf("✅ Scraper Success! [%s] Bar Buy: %.2f | Bar Sell: %.2f | OM Buy: %.2f | OM Sell: %.2f\n", updateTime, barBuy, barSell, omBuy, omSell)
		if barBuy <= 0 || barSell <= 0 || omBuy <= 0 || omSell <= 0 || updateTime == "" {
			t.Errorf("Scraper returned invalid prices/time: barBuy=%.2f, barSell=%.2f, omBuy=%.2f, omSell=%.2f, updateTime='%s'", barBuy, barSell, omBuy, omSell, updateTime)
		}
	})
}