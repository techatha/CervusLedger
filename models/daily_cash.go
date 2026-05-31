package models

type DailyCash struct {
	Date            string  `json:"date"`
	AmountYesterday float64 `json:"amount_yesterday"`
	ExpectedAmount  float64 `json:"expected_amount"`
	ActualAmount    float64 `json:"actual_amount"`
	Notes           string  `json:"notes"`
	IsSaved         bool    `json:"is_saved"`
	CreatedAt       string  `json:"created_at"`
}

type DailyCashInput struct {
	Date         string  `json:"date"`
	ActualAmount float64 `json:"actual_amount"`
	Notes        string  `json:"notes"`
}
