package models

// PawnInput is the payload sent from React when creating a new pawn.
type PawnInput struct {
	CustomerID          int     `json:"customer_id"`
	ItemType            string  `json:"item_type"`
	WeightGrams         float64 `json:"weight_grams"`
	Description         string  `json:"description"`
	PawnedDate          string  `json:"pawned_date"` // YYYY-MM-DD CE
	InitialPrincipal    float64 `json:"initial_principal"`
	MonthlyInterestRate float64 `json:"monthly_interest_rate"` // passed from frontend preview
	InterestAmount      float64 `json:"interest_amount"`       // passed from frontend preview
}

// PawnRecord represents a pawn ticket, combining table fields and joined display fields.
type PawnRecord struct {
	ID                  int     `json:"id"`
	TicketNumber        int     `json:"ticket_number"`
	CustomerID          int     `json:"customer_id"`
	CustomerName        string  `json:"customer_name,omitempty"` // Used in list views
	ItemType            string  `json:"item_type"`
	WeightGrams         float64 `json:"weight_grams"`
	Description         string  `json:"description"`
	PawnedDate          string  `json:"pawned_date"`
	InitialPrincipal    float64 `json:"initial_principal"` // Maps to principal_amount in DB
	CurrentPrincipal    float64 `json:"current_principal"` // Computed from principal_changes
	MonthlyInterestRate float64 `json:"monthly_interest_rate"`
	InterestAmount      float64 `json:"interest_amount"`
	Status              string  `json:"status"`
	TicketStatus        string  `json:"ticket_status"`
	CreatedAt           string  `json:"created_at"`
}

// PawnPayment maps to pawn_payments table.
type PawnPayment struct {
	ID           int    `json:"id"`
	PawnRecordID int    `json:"pawn_record_id"`
	Month        int    `json:"month"`
	Year         int    `json:"year"`
	PaidDate     string `json:"paid_date"`
	Notes        string `json:"notes"`
}

// PawnPaymentInput is the payload for recording a payment.
type PawnPaymentInput struct {
	PawnRecordID int    `json:"pawn_record_id"`
	Month        int    `json:"month"`
	Year         int    `json:"year"`
	PaidDate     string `json:"paid_date"`
	Notes        string `json:"notes"`
	// Passed from frontend so we can auto-log income without re-querying
	InterestAmount float64 `json:"interest_amount"`
	CustomerName   string  `json:"customer_name"`
	TicketNumber   int     `json:"ticket_number"`
}

// PrincipalChange maps to principal_changes table.
type PrincipalChange struct {
	ID           int     `json:"id"`
	PawnRecordID int     `json:"pawn_record_id"`
	Date         string  `json:"date"`
	ChangeType   string  `json:"change_type"` // reduction / increase
	Amount       float64 `json:"amount"`
	NewPrincipal float64 `json:"new_principal"`
	Notes        string  `json:"notes"`
}

// PrincipalChangeInput is the payload for adding a principal change.
type PrincipalChangeInput struct {
	PawnRecordID     int     `json:"pawn_record_id"`
	Date             string  `json:"date"`
	ChangeType       string  `json:"change_type"`
	Amount           float64 `json:"amount"`
	NewPrincipal     float64 `json:"new_principal"`
	NewInterestRate  float64 `json:"new_interest_rate"`
	NewInterestAmount float64 `json:"new_interest_amount"`
	Notes            string  `json:"notes"`
}

// PawnSettings holds the interest config read from the settings table.
type PawnSettings struct {
	LowRate      float64 // e.g. 0.3  (means 0.3% per month)
	HighRate     float64 // e.g. 0.2
	Threshold    float64 // e.g. 10000
	MinInterest  float64 // e.g. 20
	LastTicket   int
}
