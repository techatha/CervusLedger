package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type GoldPriceHandler struct {
	ctx context.Context
}

func NewGoldPriceHandler() *GoldPriceHandler {
	return &GoldPriceHandler{}
}

func (h *GoldPriceHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

// ChnwtGoldResponse maps the exact JSON structure provided for api.chnwt.dev
type ChnwtGoldResponse struct {
	Status   string `json:"status"`
	Response struct {
		Price struct {
              Gold struct {
				Buy  string `json:"buy"`
				Sell string `json:"sell"`
			} `json:"gold"`
			GoldBar struct {
				Buy  string `json:"buy"`
				Sell string `json:"sell"`
			} `json:"gold_bar"`
		} `json:"price"`
	} `json:"response"`
}

// fetchPricesFromAPI pulls from the clean api.chnwt.dev wrapper
func (h *GoldPriceHandler) fetchPricesFromAPI() (buy float64, sell float64, err error) {
	client := &http.Client{Timeout: 4 * time.Second}

	resp, err := client.Get("https://api.chnwt.dev/thai-gold-api/latest")
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	var data ChnwtGoldResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, 0, err
	}

	// Remove comma separators (e.g., "70,050.00" -> "70050.00")
	cleanBuy := strings.ReplaceAll(data.Response.Price.GoldBar.Buy, ",", "")
	cleanSell := strings.ReplaceAll(data.Response.Price.GoldBar.Sell, ",", "")

	buy, _ = strconv.ParseFloat(cleanBuy, 64)
	sell, _ = strconv.ParseFloat(cleanSell, 64)

	if buy == 0 || sell == 0 {
		return 0, 0, fmt.Errorf("invalid or zero values parsed from json api")
	}
	return buy, sell, nil
}

// scrapeGoldTradersWebsite parses the raw HTML directly from the official source
func (h *GoldPriceHandler) scrapeGoldTradersWebsite() (buy float64, sell float64, err error) {
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get("https://www.goldtraders.or.th/")
	if err != nil {
		return 0, 0, fmt.Errorf("scraper connection failure: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("scraper received HTTP error status: %d", resp.StatusCode)
	}

	// Load HTML DOM document
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return 0, 0, fmt.Errorf("failed parsing gold html structure: %w", err)
	}

	// Locate elements via official DOM IDs matching goldtraders.or.th elements
	txtBuy := doc.Find("#DetailPlaceHolder_lblBLBuy").Text()
	txtSell := doc.Find("#DetailPlaceHolder_lblBLSell").Text()

	cleanBuy := strings.ReplaceAll(strings.TrimSpace(txtBuy), ",", "")
	cleanSell := strings.ReplaceAll(strings.TrimSpace(txtSell), ",", "")

	buy, _ = strconv.ParseFloat(cleanBuy, 64)
	sell, _ = strconv.ParseFloat(cleanSell, 64)

	if buy == 0 || sell == 0 {
		return 0, 0, fmt.Errorf("scraper extracted unexpected empty text fields")
	}
	return buy, sell, nil
}
