package models

type GoldItem struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`         // e.g. ทองแท่ง, สร้อยคอ
	WeightBaht  float64 `json:"weight_baht"`  // weight in baht unit
	Purity      string  `json:"purity"`       // e.g. 96.5%, 99.99%
	Description string  `json:"description"`
	Status      string  `json:"status"`       // available / sold
	CreatedAt   string  `json:"created_at"`
}

type GoldItemInput struct {
	ID          int     `json:"id"`
	Type        string  `json:"type"`
	WeightBaht  float64 `json:"weight_baht"`
	Purity      string  `json:"purity"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
}
