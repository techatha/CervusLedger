package main

import (
	"context"
	"fmt"
	"CervusLedger/db"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) GetCustomers(search string) ([]db.Customer, error) {
	query := `SELECT id, COALESCE(prefix, ''), firstname, lastname, COALESCE(phone, ''), 
              COALESCE(id_card, ''), COALESCE(address_no, ''), COALESCE(address_line, ''), 
              COALESCE(moo, ''), COALESCE(road, ''), COALESCE(tambon, ''), 
              COALESCE(amphoe, ''), COALESCE(province, ''), COALESCE(created_at, '') 
              FROM customers`
	var args []interface{}
	if search != "" {
		query += " WHERE firstname LIKE ? OR lastname LIKE ? OR phone LIKE ? OR id_card LIKE ?"
		searchParam := "%" + search + "%"
		args = []interface{}{searchParam, searchParam, searchParam, searchParam}
	}
	query += " ORDER BY id DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var customers []db.Customer
	for rows.Next() {
		var c db.Customer
		if err := rows.Scan(&c.ID, &c.Prefix, &c.FirstName, &c.LastName, &c.Phone, &c.IDCard, &c.AddressNo, &c.AddressLine, &c.Moo, &c.Road, &c.Tambon, &c.Amphoe, &c.Province, &c.CreatedAt); err != nil {
			return nil, err
		}
		customers = append(customers, c)
	}
	if customers == nil {
		customers = []db.Customer{}
	}
	return customers, nil
}

func (a *App) GetCustomer(id int) (db.Customer, error) {
	query := `SELECT id, COALESCE(prefix, ''), firstname, lastname, COALESCE(phone, ''), 
              COALESCE(id_card, ''), COALESCE(address_no, ''), COALESCE(address_line, ''), 
              COALESCE(moo, ''), COALESCE(road, ''), COALESCE(tambon, ''), 
              COALESCE(amphoe, ''), COALESCE(province, ''), COALESCE(created_at, '') 
              FROM customers WHERE id = ?`
	var c db.Customer
	err := db.DB.QueryRow(query, id).Scan(&c.ID, &c.Prefix, &c.FirstName, &c.LastName, &c.Phone, &c.IDCard, &c.AddressNo, &c.AddressLine, &c.Moo, &c.Road, &c.Tambon, &c.Amphoe, &c.Province, &c.CreatedAt)
	return c, err
}

func (a *App) DeleteCustomer(id int) error {
	_, err := db.DB.Exec("DELETE FROM customers WHERE id = ?", id)
	return err
}

func (a *App) CreateCustomer(c db.Customer) (int, error) {
	result, err := db.DB.Exec(`INSERT INTO customers (prefix, firstname, lastname, phone, id_card, address_no, address_line, moo, road, tambon, amphoe, province) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
		c.Prefix, c.FirstName, c.LastName, c.Phone, c.IDCard, c.AddressNo, c.AddressLine, c.Moo, c.Road, c.Tambon, c.Amphoe, c.Province)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

func (a *App) UpdateCustomer(c db.Customer) error {
	_, err := db.DB.Exec(`UPDATE customers SET prefix=?, firstname=?, lastname=?, phone=?, id_card=?, address_no=?, address_line=?, moo=?, road=?, tambon=?, amphoe=?, province=? WHERE id=?`, 
		c.Prefix, c.FirstName, c.LastName, c.Phone, c.IDCard, c.AddressNo, c.AddressLine, c.Moo, c.Road, c.Tambon, c.Amphoe, c.Province, c.ID)
	return err
}

func (a *App) GetCustomerPawnRecords(id int) ([]db.PawnRecord, error) {
	query := `SELECT id, ticket_number, customer_id, item_type, weight_grams, COALESCE(description, ''), pawned_date, principal_amount, monthly_interest_rate, interest_amount, ticket_status, status, COALESCE(created_at, '') 
              FROM pawn_records WHERE customer_id = ? ORDER BY id DESC`
	rows, err := db.DB.Query(query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []db.PawnRecord
	for rows.Next() {
		var r db.PawnRecord
		if err := rows.Scan(&r.ID, &r.TicketNumber, &r.CustomerID, &r.ItemType, &r.WeightGrams, &r.Description, &r.PawnedDate, &r.PrincipalAmount, &r.MonthlyInterestRate, &r.InterestAmount, &r.TicketStatus, &r.Status, &r.CreatedAt); err != nil {
			return nil, err
		}
		records = append(records, r)
	}
	if records == nil {
		records = []db.PawnRecord{}
	}
	return records, nil
}

func (a *App) ReadSmartCard() (db.Customer, error) {
	// Stub for reading Thai smart card
	return db.Customer{
		Prefix: "นาย",
		FirstName: "ทดสอบ",
		LastName: "สมาร์ทการ์ด",
		IDCard: "1234567890123",
		AddressNo: "99/9",
		Tambon: "ช้างเผือก",
		Amphoe: "เมืองเชียงใหม่",
		Province: "เชียงใหม่",
	}, nil
}
