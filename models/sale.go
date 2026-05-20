package models

// GoldPrice is one row in gold_prices (one per calendar day).
type GoldPrice struct {
	ID               int     `json:"id"`
	Date             string  `json:"date"`
	UpdateTime       string  `json:"update_time"`
	BuyPricePerBaht  float64 `json:"buy_price_per_baht"`
	SellPricePerBaht float64 `json:"sell_price_per_baht"`
	OmBuyPrice       float64 `json:"om_buy_price"`
	OmSellPrice      float64 `json:"om_sell_price"`
}

// Sale is a single buy or sell transaction.
type Sale struct {
	ID           int     `json:"id"`
	CustomerID   int     `json:"customer_id"`    // 0 = walk-in / no record
	CustomerName string  `json:"customer_name"`  // joined, empty if none
	GoldItemID   int     `json:"gold_item_id"`   // 0 = bought item (no prior stock entry)
	GoldItemType string  `json:"gold_item_type"` // joined or from input
	Type         string  `json:"type"`           // buy / sell
	WeightBaht   float64 `json:"weight_baht"`
	GoldPriceID  int     `json:"gold_price_id"`
	PricePerBaht float64 `json:"price_per_baht"`
	TotalAmount  float64 `json:"total_amount"`
	Notes        string  `json:"notes"`
	Date         string  `json:"date"`
	CreatedAt    string  `json:"created_at"`
}

// SaleInput is the payload from the React form.
type SaleInput struct {
	Type         string  `json:"type"`          // "buy" | "sell"
	CustomerID   int     `json:"customer_id"`   // 0 = no customer
	GoldItemID   int     `json:"gold_item_id"`  // sell: required; buy: 0
	WeightBaht   float64 `json:"weight_baht"`
	GoldPriceID  int     `json:"gold_price_id"`
	PricePerBaht float64 `json:"price_per_baht"`
	TotalAmount  float64 `json:"total_amount"`
	Notes        string  `json:"notes"`
	Date         string  `json:"date"` // YYYY-MM-DD CE

	// Buy only: details for the new gold_item created from this purchase
	ItemType    string `json:"item_type"`
	Purity      string `json:"purity"`
	Description string `json:"description"`
}
