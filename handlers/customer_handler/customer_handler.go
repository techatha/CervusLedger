package customer_handler

import (
	"context"
	"CervusLedger/db"
	"CervusLedger/models"
)

type CustomerHandler struct {
	ctx context.Context
}

func NewCustomerHandler() *CustomerHandler {
	return &CustomerHandler{}
}

func (h *CustomerHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *CustomerHandler) GetCustomers(search string) ([]models.Customer, error) {
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

	var customers []models.Customer
	for rows.Next() {
		var c models.Customer
		if err := rows.Scan(&c.ID, &c.Prefix, &c.FirstName, &c.LastName, &c.Phone, &c.IDCard, &c.AddressNo, &c.AddressLine, &c.Moo, &c.Road, &c.Tambon, &c.Amphoe, &c.Province, &c.CreatedAt); err != nil {
			return nil, err
		}
		customers = append(customers, c)
	}
	if customers == nil {
		customers = []models.Customer{}
	}
	return customers, nil
}

func (h *CustomerHandler) GetCustomer(id int) (models.Customer, error) {
	query := `SELECT id, COALESCE(prefix, ''), firstname, lastname, COALESCE(phone, ''), 
              COALESCE(id_card, ''), COALESCE(address_no, ''), COALESCE(address_line, ''), 
              COALESCE(moo, ''), COALESCE(road, ''), COALESCE(tambon, ''), 
              COALESCE(amphoe, ''), COALESCE(province, ''), COALESCE(created_at, '') 
              FROM customers WHERE id = ?`
	var c models.Customer
	err := db.DB.QueryRow(query, id).Scan(&c.ID, &c.Prefix, &c.FirstName, &c.LastName, &c.Phone, &c.IDCard, &c.AddressNo, &c.AddressLine, &c.Moo, &c.Road, &c.Tambon, &c.Amphoe, &c.Province, &c.CreatedAt)
	return c, err
}

func (h *CustomerHandler) DeleteCustomer(id int) error {
	_, err := db.DB.Exec("DELETE FROM customers WHERE id = ?", id)
	return err
}

func (h *CustomerHandler) CreateCustomer(c models.Customer) (int, error) {
	result, err := db.DB.Exec(`INSERT INTO customers (prefix, firstname, lastname, phone, id_card, address_no, address_line, moo, road, tambon, amphoe, province) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
		c.Prefix, c.FirstName, c.LastName, c.Phone, c.IDCard, c.AddressNo, c.AddressLine, c.Moo, c.Road, c.Tambon, c.Amphoe, c.Province)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

func (h *CustomerHandler) UpdateCustomer(c models.Customer) error {
	_, err := db.DB.Exec(`UPDATE customers SET prefix=?, firstname=?, lastname=?, phone=?, id_card=?, address_no=?, address_line=?, moo=?, road=?, tambon=?, amphoe=?, province=? WHERE id=?`, 
		c.Prefix, c.FirstName, c.LastName, c.Phone, c.IDCard, c.AddressNo, c.AddressLine, c.Moo, c.Road, c.Tambon, c.Amphoe, c.Province, c.ID)
	return err
}
