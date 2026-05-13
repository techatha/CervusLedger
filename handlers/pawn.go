package handlers

import (
	"CervusLedger/db"
	"CervusLedger/models"
	"context"
	"fmt"
	"strconv"
)

type PawnHandler struct {
	ctx context.Context
}

func NewPawnHandler() *PawnHandler {
	return &PawnHandler{}
}

func (h *PawnHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *PawnHandler) GetCustomerPawnRecords(id int) ([]models.PawnRecord, error) {
	rows, err := db.DB.Query(`
		SELECT
			pr.id, pr.ticket_number, pr.customer_id,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.principal_amount AS initial_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.created_at,
			COALESCE(
				(SELECT pc.new_principal FROM principal_changes pc
				 WHERE pc.pawn_record_id = pr.id
				 ORDER BY pc.date DESC, pc.id DESC LIMIT 1),
				pr.principal_amount
			) AS current_principal
		FROM pawn_records pr
		WHERE pr.customer_id = ?
		ORDER BY pr.pawned_date DESC, pr.id DESC
	`, id)
	if err != nil {
		return nil, fmt.Errorf("customer pawn records: %w", err)
	}
	defer rows.Close()

	var records []models.PawnRecord
	for rows.Next() {
		var r models.PawnRecord
		if err := rows.Scan(
			&r.ID, &r.TicketNumber, &r.CustomerID,
			&r.ItemType, &r.WeightGrams, &r.Description,
			&r.PawnedDate, &r.InitialPrincipal,
			&r.MonthlyInterestRate, &r.InterestAmount,
			&r.Status, &r.TicketStatus, &r.CreatedAt,
			&r.CurrentPrincipal,
		); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		records = append(records, r)
	}
	return records, nil
}

// ─── Settings helpers ──────────────────────────────────────────────────────

func (h *PawnHandler) GetPawnSettings() (models.PawnSettings, error) {
	rows, err := db.DB.Query(`
		SELECT key, value FROM settings
		WHERE key IN ('interest_rate_low','interest_rate_high','interest_threshold',
		              'min_interest_amount','last_ticket_number')
	`)
	if err != nil {
		return models.PawnSettings{}, err
	}
	defer rows.Close()

	s := models.PawnSettings{
		LowRate:     0.3,
		HighRate:    0.2,
		Threshold:   10000,
		MinInterest: 20,
		LastTicket:  0,
	}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		f, _ := strconv.ParseFloat(v, 64)
		switch k {
		case "interest_rate_low":
			s.LowRate = f
		case "interest_rate_high":
			s.HighRate = f
		case "interest_threshold":
			s.Threshold = f
		case "min_interest_amount":
			s.MinInterest = f
		case "last_ticket_number":
			s.LastTicket = int(f)
		}
	}
	return s, nil
}

// CalcInterest returns (rate%, amount) for a given principal using shop settings.
func CalcInterest(principal float64, s models.PawnSettings) (rate, amount float64) {
	if principal < s.Threshold {
		rate = s.LowRate
	} else {
		rate = s.HighRate
	}
	amount = principal * rate / 100
	if amount < s.MinInterest {
		amount = s.MinInterest
	}
	return
}

func nextTicketNumber() (int, error) {
	var raw string
	err := db.DB.QueryRow(`SELECT value FROM settings WHERE key = 'last_ticket_number'`).Scan(&raw)
	if err != nil {
		// key missing — start at 1
		_, _ = db.DB.Exec(`INSERT OR IGNORE INTO settings(key,value) VALUES('last_ticket_number','0')`)
		raw = "0"
	}
	n, _ := strconv.Atoi(raw)
	n++
	if n > 9999 {
		n = 1
	}
	_, err = db.DB.Exec(`UPDATE settings SET value = ? WHERE key = 'last_ticket_number'`, strconv.Itoa(n))
	return n, err
}

// ─── Create ────────────────────────────────────────────────────────────────

func (h *PawnHandler) CreatePawn(input models.PawnInput) (models.PawnRecord, error) {
	ticket, err := nextTicketNumber()
	if err != nil {
		return models.PawnRecord{}, fmt.Errorf("ticket number: %w", err)
	}

	res, err := db.DB.Exec(`
		INSERT INTO pawn_records
		  (ticket_number, customer_id, item_type, weight_grams, description,
		   pawned_date, principal_amount, monthly_interest_rate, interest_amount,
		   status, ticket_status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'active')
	`,
		ticket,
		input.CustomerID,
		input.ItemType,
		input.WeightGrams,
		input.Description,
		input.PawnedDate,
		input.InitialPrincipal,
		input.MonthlyInterestRate,
		input.InterestAmount,
	)
	if err != nil {
		return models.PawnRecord{}, fmt.Errorf("insert pawn: %w", err)
	}
	id, _ := res.LastInsertId()
	return h.GetPawn(int(id))
}

// ─── Read ──────────────────────────────────────────────────────────────────

func (h *PawnHandler) GetPawn(id int) (models.PawnRecord, error) {
	var r models.PawnRecord
	err := db.DB.QueryRow(`
		SELECT
			pr.id, pr.ticket_number, pr.customer_id,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.principal_amount AS initial_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.created_at,
			COALESCE(
				(SELECT pc.new_principal FROM principal_changes pc
				 WHERE pc.pawn_record_id = pr.id
				 ORDER BY pc.date DESC, pc.id DESC LIMIT 1),
				pr.principal_amount
			) AS current_principal
		FROM pawn_records pr
		WHERE pr.id = ?
	`, id).Scan(
		&r.ID, &r.TicketNumber, &r.CustomerID,
		&r.ItemType, &r.WeightGrams, &r.Description,
		&r.PawnedDate, &r.InitialPrincipal,
		&r.MonthlyInterestRate, &r.InterestAmount,
		&r.Status, &r.TicketStatus, &r.CreatedAt,
		&r.CurrentPrincipal,
	)
	if err != nil {
		return r, fmt.Errorf("get pawn %d: %w", id, err)
	}
	return r, nil
}

// ListPawns returns all pawns with joined customer name.
// status = "" means all; search matches ticket number, customer name, or item type.
func (h *PawnHandler) ListPawns(status, search string) ([]models.PawnRecord, error) {
	query := `
		SELECT
			pr.id, pr.ticket_number, pr.customer_id,
			(c.prefix || ' ' || c.firstname || ' ' || c.lastname) AS customer_name,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.principal_amount AS initial_principal,
			COALESCE(
				(SELECT pc.new_principal FROM principal_changes pc
				 WHERE pc.pawn_record_id = pr.id
				 ORDER BY pc.date DESC, pc.id DESC LIMIT 1),
				pr.principal_amount
			) AS current_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.created_at
		FROM pawn_records pr
		LEFT JOIN customers c ON c.id = pr.customer_id
		WHERE 1=1
	`
	args := []interface{}{}

	if status != "" {
		query += ` AND pr.status = ?`
		args = append(args, status)
	}
	if search != "" {
		like := "%" + search + "%"
		query += ` AND (
			CAST(pr.ticket_number AS TEXT) LIKE ?
			OR c.firstname LIKE ?
			OR c.lastname  LIKE ?
			OR pr.item_type LIKE ?
		)`
		args = append(args, like, like, like, like)
	}
	query += ` ORDER BY pr.id DESC`

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list pawns: %w", err)
	}
	defer rows.Close()

	var list []models.PawnRecord
	for rows.Next() {
		var item models.PawnRecord
		err := rows.Scan(
			&item.ID, &item.TicketNumber, &item.CustomerID,
			&item.CustomerName, &item.ItemType, &item.WeightGrams,
			&item.Description, &item.PawnedDate, &item.InitialPrincipal,
			&item.CurrentPrincipal, &item.MonthlyInterestRate,
			&item.InterestAmount, &item.Status, &item.TicketStatus,
			&item.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan pawn list: %w", err)
		}
		list = append(list, item)
	}
	return list, nil
}



// ─── Status changes ────────────────────────────────────────────────────────

func (h *PawnHandler) RedeemPawn(id int) error {
	res, err := db.DB.Exec(`UPDATE pawn_records SET status = 'ถอน' WHERE id = ? AND status = 'active'`, id)
	if err != nil {
		return fmt.Errorf("redeem pawn: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("pawn %d not found or not active", id)
	}
	return nil
}

func (h *PawnHandler) ForfeitPawn(id int) error {
	res, err := db.DB.Exec(`UPDATE pawn_records SET status = 'ขาด' WHERE id = ? AND status = 'active'`, id)
	if err != nil {
		return fmt.Errorf("forfeit pawn: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("pawn %d not found or not active", id)
	}
	return nil
}

// UpdateTicketStatus marks a pawn ticket as lost or damaged.
func (h *PawnHandler) UpdateTicketStatus(id int, ticketStatus string) error {
	_, err := db.DB.Exec(`UPDATE pawn_records SET ticket_status = ? WHERE id = ?`, ticketStatus, id)
	return err
}
