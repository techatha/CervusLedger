package db

type Customer struct {
	ID          int    `json:"id"`
	Prefix      string `json:"prefix"`
	FirstName   string `json:"firstname"`
	LastName    string `json:"lastname"`
	Phone       string `json:"phone"`
	IDCard      string `json:"id_card"`
	AddressNo   string `json:"address_no"`
	AddressLine string `json:"address_line"`
	Moo         string `json:"moo"`
	Road        string `json:"road"`
	Tambon      string `json:"tambon"`
	Amphoe      string `json:"amphoe"`
	Province    string `json:"province"`
	CreatedAt   string `json:"created_at"`
}

type PawnRecord struct {
	ID                  int     `json:"id"`
	TicketNumber        int     `json:"ticket_number"`
	CustomerID          int     `json:"customer_id"`
	ItemType            string  `json:"item_type"`
	WeightGrams         float64 `json:"weight_grams"`
	Description         string  `json:"description"`
	PawnedDate          string  `json:"pawned_date"`
	PrincipalAmount     float64 `json:"principal_amount"`
	MonthlyInterestRate float64 `json:"monthly_interest_rate"`
	InterestAmount      float64 `json:"interest_amount"`
	TicketStatus        string  `json:"ticket_status"`
	Status              string  `json:"status"`
	CreatedAt           string  `json:"created_at"`
}
