package models

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