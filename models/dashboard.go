package models

type DashboardStats struct {
	// Gold price
	TodayPrice GoldPrice `json:"today_price"`

	// Pawn overview
	ActivePawnCount     int     `json:"active_pawn_count"`
	ActivePawnPrincipal float64 `json:"active_pawn_principal"`
	PaidThisMonth       int     `json:"paid_this_month"`
	UnpaidThisMonth     int     `json:"unpaid_this_month"`

	// Today
	TodayIncome   float64 `json:"today_income"`
	TodayExpense  float64 `json:"today_expense"`
	TodayNewPawns int     `json:"today_new_pawns"`

	// This month
	MonthInterestCollected float64 `json:"month_interest_collected"`

	// Recent lists (5 each)
	RecentPawns    []PawnRecord `json:"recent_pawns"`
	RecentActivity []IncomeExpense `json:"recent_activity"`
}
