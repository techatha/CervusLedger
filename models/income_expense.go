package models

type IncomeExpense struct {
	ID             int     `json:"id"`
	Type           string  `json:"type"`     // income / expense
	Category       string  `json:"category"`
	Amount         float64 `json:"amount"`
	Notes          string  `json:"notes"`
	Source         string  `json:"source"` // manual / auto
	IsBankTransfer bool    `json:"is_bank_transfer"`
	Date           string  `json:"date"`
	CreatedAt      string  `json:"created_at"`
	TransactionID  string  `json:"transaction_id"`
	Status         string  `json:"status"` // "active" | "cancelled"
}

type IncomeExpenseInput struct {
	Type           string  `json:"type"`
	Category       string  `json:"category"`
	Amount         float64 `json:"amount"`
	Notes          string  `json:"notes"`
	IsBankTransfer bool    `json:"is_bank_transfer"`
	Date           string  `json:"date"`
}

type IncomeExpenseUpdateInput struct {
	Notes          string  `json:"notes"`
	IsBankTransfer bool    `json:"is_bank_transfer"`
	Amount         float64 `json:"amount"`
	Category       string  `json:"category"`
}

type IncomeExpenseFilter struct {
	Type      string `json:"type"`       // "" | "income" | "expense"
	Source    string `json:"source"`     // "" | "manual" | "auto"
	StartDate string `json:"start_date"` // YYYY-MM-DD
	EndDate   string `json:"end_date"`   // YYYY-MM-DD
	Status    string `json:"status"`     // "" | "active" | "cancelled" | "all"
}

type IncomeExpenseSummary struct {
	TotalIncome  float64 `json:"total_income"`
	TotalExpense float64 `json:"total_expense"`
	Net          float64 `json:"net"`
	StartDate    string  `json:"start_date"`
	EndDate      string  `json:"end_date"`
}

// CancelPreview describes what will happen if an income/expense entry is cancelled.
type CancelPreview struct {
	EntryID             int               `json:"entry_id"`
	Category            string            `json:"category"`
	CanCancel           bool              `json:"can_cancel"`
	Reason              string            `json:"reason,omitempty"`
	WillRevertPayments  []PawnPaymentInfo `json:"will_revert_payments,omitempty"`
	WillRevertStock     bool              `json:"will_revert_stock"`
	WillRevertPrincipal bool              `json:"will_revert_principal"`
	CascadeChanges      []PrincipalChange `json:"cascade_changes,omitempty"`
	Notice              string            `json:"notice,omitempty"`
}

// PawnPaymentInfo provides display info about payments that will be reverted.
type PawnPaymentInfo struct {
	PawnRecordID int    `json:"pawn_record_id"`
	TicketNumber int    `json:"ticket_number"`
	Month        int    `json:"month"`
	Year         int    `json:"year"`
}
