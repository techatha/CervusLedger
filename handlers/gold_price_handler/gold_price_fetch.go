package gold_price_handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
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
		UpdateDate string `json:"update_date"`
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

var dateRegex = regexp.MustCompile(`\b(\d{1,2})/(\d{1,2})/(\d{4})\b`)

func parseBEDateToCEDate(input string) string {
	match := dateRegex.FindStringSubmatch(input)
	if len(match) != 4 {
		return time.Now().Format("2006-01-02")
	}
	day, _ := strconv.Atoi(match[1])
	month, _ := strconv.Atoi(match[2])
	beYear, _ := strconv.Atoi(match[3])
	ceYear := beYear - 543
	return fmt.Sprintf("%04d-%02d-%02d", ceYear, month, day)
}

// fetchPricesFromAPI pulls from the clean api.chnwt.dev wrapper
func (h *GoldPriceHandler) fetchPricesFromAPI() (barBuy, barSell, omBuy, omSell float64, date, updateTime string, err error) {
	client := &http.Client{Timeout: 8 * time.Second}

	req, err := http.NewRequest("GET", "https://api.chnwt.dev/thai-gold-api/latest", nil)
	if err != nil {
		return 0, 0, 0, 0, "", "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return 0, 0, 0, 0, "", "", err
	}
	defer resp.Body.Close()

	var data ChnwtGoldResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, 0, 0, 0, "", "", err
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
		return 0, 0, 0, 0, "", "", fmt.Errorf("invalid or zero values parsed from json api")
	}

	apiUpdateTime := data.Response.UpdateTime
	if data.Response.UpdateDate != "" {
		apiUpdateTime = fmt.Sprintf("%s %s", data.Response.UpdateDate, data.Response.UpdateTime)
	}
	parsedDate := parseBEDateToCEDate(apiUpdateTime)

	return barBuy, barSell, omBuy, omSell, parsedDate, apiUpdateTime, nil
}

// scrapeGoldTradersWebsite parses the raw HTML directly from the official source
func (h *GoldPriceHandler) scrapeGoldTradersWebsite() (barBuy, barSell, omBuy, omSell float64, date, updateTime string, err error) {
	urls := []string{
		"https://classic.goldtraders.or.th/",
		"https://classic.goldtraders.or.th/default.aspx",
	}

	var lastErr error
	for _, targetURL := range urls {
		barBuy, barSell, omBuy, omSell, date, updateTime, err = h.scrapeURL(targetURL)
		if err == nil {
			return barBuy, barSell, omBuy, omSell, date, updateTime, nil
		}
		lastErr = err
	}

	return 0, 0, 0, 0, "", "", fmt.Errorf("all scraper attempts failed. Last error: %w", lastErr)
}

func (h *GoldPriceHandler) scrapeURL(targetURL string) (barBuy, barSell, omBuy, omSell float64, date, updateTime string, err error) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return 0, 0, 0, 0, "", "", fmt.Errorf("scraper request creation failure: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return 0, 0, 0, 0, "", "", fmt.Errorf("scraper connection failure on %s: %w", targetURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, 0, 0, "", "", fmt.Errorf("scraper received HTTP error status %d from %s", resp.StatusCode, targetURL)
	}

	// Load HTML DOM document
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return 0, 0, 0, 0, "", "", fmt.Errorf("failed parsing gold html structure from %s: %w", targetURL, err)
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

	idx := strings.Index(rawTime, "เวลา")
	if idx != -1 {
		updateTime = strings.TrimSpace(rawTime[idx:])
	} else {
		parts := strings.Fields(rawTime)
		if len(parts) > 1 {
			updateTime = strings.Join(parts[1:], " ")
		} else {
			updateTime = rawTime
		}
	}

	parsedDate := parseBEDateToCEDate(rawTime)

	if barBuy == 0 || barSell == 0 || omBuy == 0 || omSell == 0 {
		return 0, 0, 0, 0, "", "", fmt.Errorf("scraper extracted unexpected empty text fields from %s", targetURL)
	}
	return barBuy, barSell, omBuy, omSell, parsedDate, updateTime, nil
}
