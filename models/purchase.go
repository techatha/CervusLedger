package models

type PurchasedGold struct {
	ID           int     `json:"id"`
	CustomerID   int     `json:"customer_id"`
	CustomerName string  `json:"customer_name"` // Joined
	Type         string  `json:"type"`
	Subtype      string  `json:"subtype"`
	WeightBaht   float64 `json:"weight_baht"`
	WeightGrams  float64 `json:"weight_grams"`
	TotalAmount  float64 `json:"total_amount"`
	Notes        string  `json:"notes"`
	Date         string  `json:"date"`
	IsInventory  int     `json:"is_inventory"` // 1 = in stock, 0 = scrap
	StillExists  int     `json:"still_exists"` // 1 = exists in shop, 0 = melted/sold
	CreatedAt    string  `json:"created_at"`
}

type PurchaseInput struct {
	CustomerID   int     `json:"customer_id"`
	Type         string  `json:"type"`
	Subtype      string  `json:"subtype"`
	WeightBaht   float64 `json:"weight_baht"`
	WeightGrams  float64 `json:"weight_grams"`
	TotalAmount  float64 `json:"total_amount"`
	Notes        string  `json:"notes"`
	Date         string  `json:"date"`
	IsInventory  int     `json:"is_inventory"`
}
