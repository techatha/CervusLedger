package models

type GoldItem struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`    // e.g. ทองแท่ง, สร้อยคอ
	Subtype     string  `json:"subtype"` // e.g. 1 บาท, 2 บาท, 1 กรัม, ครึ่งสลึง
	Purity      string  `json:"purity"`
	WeightGrams float64 `json:"weight_grams"`
	NoPurity    int     `json:"no_purity"`
	NoWeight    int     `json:"no_weight"`
	CreatedAt   string  `json:"created_at"`
}

type GoldItemInput struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`
	Subtype     string  `json:"subtype"`
	Purity      string  `json:"purity"`
	WeightGrams float64 `json:"weight_grams"`
	NoPurity    int     `json:"no_purity"`
	NoWeight    int     `json:"no_weight"`
}

type GoldStockLog struct {
	ID            int    `json:"id"`
	GoldItemID    int    `json:"gold_item_id"`
	Type          string `json:"type"`
	Subtype       string `json:"subtype"`
	Amount        int    `json:"amount"`
	CreatedAt     string `json:"created_at"`
	TransactionID string `json:"transaction_id"`
}

type GoldStockLogInput struct {
	GoldItemID int `json:"gold_item_id"`
	Amount     int `json:"amount"`
}

// GoldItemWithStock combines catalog info with latest stock amount
// and a short recent history (one entry per day, last N days).
type GoldItemWithStock struct {
	GoldItem
	LatestAmount  int            `json:"latest_amount"`
	RecentHistory []GoldStockLog `json:"recent_history"`
}
