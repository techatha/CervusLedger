package models

type GoldItem struct {
	ID         int     `json:"id"`
	Type       string  `json:"type"`        // e.g. ทองแท่ง, สร้อยคอ
	WeightBaht float64 `json:"weight_baht"` // weight in baht unit
	CreatedAt  string  `json:"created_at"`
}

type GoldItemInput struct {
	ID         int     `json:"id"`
	Type       string  `json:"type"`
	WeightBaht float64 `json:"weight_baht"`
}

type GoldStockLog struct {
	ID         int     `json:"id"`
	GoldItemID int     `json:"gold_item_id"`
	Type       string  `json:"type"`
	WeightBaht float64 `json:"weight_baht"`
	Amount     int     `json:"amount"`
	LogDate    string  `json:"log_date"` // YYYY-MM-DD
	CreatedAt  string  `json:"created_at"`
}

type GoldStockLogInput struct {
	GoldItemID int    `json:"gold_item_id"`
	Amount     int    `json:"amount"`
	LogDate    string `json:"log_date"` // YYYY-MM-DD
}
