package models

type GoldItem struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`    // e.g. ทองแท่ง, สร้อยคอ
	Subtype     string  `json:"subtype"` // e.g. 1 บาท, 2 บาท, 1 กรัม, ครึ่งสลึง
	Purity      string  `json:"purity"`
	WeightGrams float64 `json:"weight_grams"`
	CreatedAt   string  `json:"created_at"`
}

type GoldItemInput struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`
	Subtype     string  `json:"subtype"`
	Purity      string  `json:"purity"`
	WeightGrams float64 `json:"weight_grams"`
}

type GoldStockLog struct {
	ID         int    `json:"id"`
	GoldItemID int    `json:"gold_item_id"`
	Type       string `json:"type"`
	Subtype    string `json:"subtype"`
	Amount     int    `json:"amount"`
	LogDate    string `json:"log_date"` // YYYY-MM-DD
	CreatedAt  string `json:"created_at"`
}

type GoldStockLogInput struct {
	GoldItemID int    `json:"gold_item_id"`
	Amount     int    `json:"amount"`
	LogDate    string `json:"log_date"` // YYYY-MM-DD
}
