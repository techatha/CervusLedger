package models

type IncomeExpense struct {
	ID        int     `json:"id"`
	Type      string  `json:"type"`     // income / expense
	Category  string  `json:"category"`
	Amount    float64 `json:"amount"`
	Notes     string  `json:"notes"`
	Source    string  `json:"source"` // manual / auto
	Date      string  `json:"date"`
	CreatedAt string  `json:"created_at"`
}

type IncomeExpenseInput struct {
	Type     string  `json:"type"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	Notes    string  `json:"notes"`
	Date     string  `json:"date"`
}

type IncomeExpenseFilter struct {
	Type      string `json:"type"`       // "" | "income" | "expense"
	Source    string `json:"source"`     // "" | "manual" | "auto"
	StartDate string `json:"start_date"` // YYYY-MM-DD
	EndDate   string `json:"end_date"`   // YYYY-MM-DD
}

type IncomeExpenseSummary struct {
	TotalIncome  float64 `json:"total_income"`
	TotalExpense float64 `json:"total_expense"`
	Net          float64 `json:"net"`
	StartDate    string  `json:"start_date"`
	EndDate      string  `json:"end_date"`
}
