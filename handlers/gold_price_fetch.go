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
		UpdateTime string `json:"update_time"`
		Price      struct {
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
func (h *GoldPriceHandler) fetchPricesFromAPI() (barBuy, barSell, omBuy, omSell float64, updateTime string, err error) {
	client := &http.Client{Timeout: 4 * time.Second}

	resp, err := client.Get("https://api.chnwt.dev/thai-gold-api/latest")
	if err != nil {
		return 0, 0, 0, 0, "", err
	}
	defer resp.Body.Close()

	var data ChnwtGoldResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, 0, 0, 0, "", err
	}

	// Remove comma separators (e.g., "70,050.00" -> "70050.00")
	cleanBarBuy := strings.ReplaceAll(data.Response.Price.GoldBar.Buy, ",", "")
	cleanBarSell := strings.ReplaceAll(data.Response.Price.GoldBar.Sell, ",", "")
	cleanOmBuy := strings.ReplaceAll(data.Response.Price.Gold.Buy, ",", "")
	cleanOmSell := strings.ReplaceAll(data.Response.Price.Gold.Sell, ",", "")

	barBuy, _ = strconv.ParseFloat(cleanBarBuy, 64)
	barSell, _ = strconv.ParseFloat(cleanBarSell, 64)
	omBuy, _ = strconv.ParseFloat(cleanOmBuy, 64)
	omSell, _ = strconv.ParseFloat(cleanOmSell, 64)

	if barBuy == 0 || barSell == 0 || omBuy == 0 || omSell == 0 {
		return 0, 0, 0, 0, "", fmt.Errorf("invalid or zero values parsed from json api")
	}
	return barBuy, barSell, omBuy, omSell, data.Response.UpdateTime, nil
}

// scrapeGoldTradersWebsite parses the raw HTML directly from the official source
func (h *GoldPriceHandler) scrapeGoldTradersWebsite() (barBuy, barSell, omBuy, omSell float64, updateTime string, err error) {
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get("https://classic.goldtraders.or.th/")
	if err != nil {
		return 0, 0, 0, 0, "", fmt.Errorf("scraper connection failure: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, 0, 0, "", fmt.Errorf("scraper received HTTP error status: %d", resp.StatusCode)
	}

	// Load HTML DOM document
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return 0, 0, 0, 0, "", fmt.Errorf("failed parsing gold html structure: %w", err)
	}

	// Locate elements via official DOM IDs matching goldtraders.or.th elements
	txtBarBuy := doc.Find("#DetailPlace_uc_goldprices1_lblBLBuy").Text()
	txtBarSell := doc.Find("#DetailPlace_uc_goldprices1_lblBLSell").Text()
	txtOmBuy := doc.Find("#DetailPlace_uc_goldprices1_lblOMBuy").Text()
	txtOmSell := doc.Find("#DetailPlace_uc_goldprices1_lblOMSell").Text()

	cleanBarBuy := strings.ReplaceAll(strings.TrimSpace(txtBarBuy), ",", "")
	cleanBarSell := strings.ReplaceAll(strings.TrimSpace(txtBarSell), ",", "")
	cleanOmBuy := strings.ReplaceAll(strings.TrimSpace(txtOmBuy), ",", "")
	cleanOmSell := strings.ReplaceAll(strings.TrimSpace(txtOmSell), ",", "")

	barBuy, _ = strconv.ParseFloat(cleanBarBuy, 64)
	barSell, _ = strconv.ParseFloat(cleanBarSell, 64)
	omBuy, _ = strconv.ParseFloat(cleanOmBuy, 64)
	omSell, _ = strconv.ParseFloat(cleanOmSell, 64)

	rawTime := doc.Find("#DetailPlace_uc_goldprices1_lblAsTime").Text()
	rawTime = strings.TrimSpace(rawTime)
	parts := strings.Fields(rawTime)
	if len(parts) > 1 {
		updateTime = strings.Join(parts[1:], " ")
	} else {
		updateTime = rawTime
	}

	if barBuy == 0 || barSell == 0 || omBuy == 0 || omSell == 0 {
		return 0, 0, 0, 0, "", fmt.Errorf("scraper extracted unexpected empty text fields")
	}
	return barBuy, barSell, omBuy, omSell, updateTime, nil
}
