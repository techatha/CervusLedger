package models

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

