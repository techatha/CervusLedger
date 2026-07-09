package pawn_handler

import (
	"CervusLedger/db"
	"CervusLedger/models"
	"context"
	"fmt"
	"strconv"
	"time"
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

// ListPawnsSorted returns all pawns with joined customer name, sorted by ticket number.
// status = "" means all; search matches ticket number, customer name, or item type.
// sortOrder = "asc" or "desc".
func (h *PawnHandler) ListPawnsSorted(status, search, sortOrder string) ([]models.PawnRecord, error) {
	query := `
		SELECT
			pr.id, pr.ticket_number, pr.customer_id,
			COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, 'ไม่พบข้อมูลลูกค้า') AS customer_name,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.principal_amount AS initial_principal,
			COALESCE(
				(SELECT pc.new_principal FROM principal_changes pc
				 WHERE pc.pawn_record_id = pr.id
				 ORDER BY pc.date DESC, pc.id DESC LIMIT 1),
				pr.principal_amount
			) AS current_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.redeemed_at, pr.forfeited_at, pr.created_at,
			(SELECT pp.month FROM pawn_payments pp
			 WHERE pp.pawn_record_id = pr.id
			 ORDER BY pp.year DESC, pp.month DESC LIMIT 1) AS last_paid_month,
			(SELECT pp.year FROM pawn_payments pp
			 WHERE pp.pawn_record_id = pr.id
			 ORDER BY pp.year DESC, pp.month DESC LIMIT 1) AS last_paid_year
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

	if sortOrder == "asc" {
		query += ` ORDER BY pr.ticket_number ASC`
	} else {
		query += ` ORDER BY pr.ticket_number DESC`
	}

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list pawns sorted: %w", err)
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
			&item.RedeemedAt, &item.ForfeitedAt, &item.CreatedAt,
			&item.LastPaidMonth, &item.LastPaidYear,
		)
		if err != nil {
			return nil, fmt.Errorf("scan pawn list: %w", err)
		}
		list = append(list, item)
	}
	return list, nil
}

func (h *PawnHandler) GetCustomerPawnRecords(id int) ([]models.PawnRecord, error) {
	rows, err := db.DB.Query(`
		SELECT
			pr.id, pr.ticket_number, pr.customer_id,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.principal_amount AS initial_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.redeemed_at, pr.forfeited_at, pr.created_at,
			COALESCE(
				(SELECT pc.new_principal FROM principal_changes pc
				 WHERE pc.pawn_record_id = pr.id
				 ORDER BY pc.date DESC, pc.id DESC LIMIT 1),
				pr.principal_amount
			) AS current_principal,
			(SELECT pp.month FROM pawn_payments pp
			 WHERE pp.pawn_record_id = pr.id
			 ORDER BY pp.year DESC, pp.month DESC LIMIT 1) AS last_paid_month,
			(SELECT pp.year FROM pawn_payments pp
			 WHERE pp.pawn_record_id = pr.id
			 ORDER BY pp.year DESC, pp.month DESC LIMIT 1) AS last_paid_year
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
			&r.Status, &r.TicketStatus, &r.RedeemedAt, &r.ForfeitedAt, &r.CreatedAt,
			&r.CurrentPrincipal, &r.LastPaidMonth, &r.LastPaidYear,
		); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		records = append(records, r)
	}
	return records, nil
}

// GetPawnSettings returns the pawn-related settings parameters.
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

// CreatePawn registers a new pawn record, logs the cash outlay, and returns it.
func (h *PawnHandler) CreatePawn(input models.PawnInput) (models.PawnRecord, error) {
	tx, err := db.DB.Begin()
	if err != nil {
		return models.PawnRecord{}, err
	}
	defer tx.Rollback()

	// 1. Get next ticket number inside the transaction
	var raw string
	err = tx.QueryRow(`SELECT value FROM settings WHERE key = 'last_ticket_number'`).Scan(&raw)
	if err != nil {
		_, _ = tx.Exec(`INSERT OR IGNORE INTO settings(key,value) VALUES('last_ticket_number','0')`)
		raw = "0"
	}
	ticket, _ := strconv.Atoi(raw)
	ticket++
	if ticket > 9999 {
		ticket = 1
	}
	_, err = tx.Exec(`UPDATE settings SET value = ? WHERE key = 'last_ticket_number'`, strconv.Itoa(ticket))
	if err != nil {
		return models.PawnRecord{}, fmt.Errorf("update last ticket: %w", err)
	}

	pawnedDateVal := input.PawnedDate
	if len(pawnedDateVal) == 10 {
		pawnedDateVal = pawnedDateVal + " " + time.Now().Format("15:04:05")
	}

	// 2. Insert pawn record
	res, err := tx.Exec(`
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
		pawnedDateVal,
		input.InitialPrincipal,
		input.MonthlyInterestRate,
		input.InterestAmount,
	)
	if err != nil {
		return models.PawnRecord{}, fmt.Errorf("insert pawn: %w", err)
	}
	id, _ := res.LastInsertId()

	// 3. Fetch customer name safely
	var prefix, firstname, lastname string
	_ = tx.QueryRow(`SELECT COALESCE(prefix, ''), firstname, lastname FROM customers WHERE id = ?`, input.CustomerID).Scan(&prefix, &firstname, &lastname)

	customerName := ""
	if prefix != "" {
		customerName = prefix + " "
	}
	customerName += firstname + " " + lastname

	// 4. Auto-log as expense
	notes := fmt.Sprintf("รับจำนำ ตั๋ว %04d (%s) - %s", ticket, customerName, input.ItemType)
	_, err = tx.Exec(`
		INSERT INTO income_expenses (type, category, amount, notes, source, date)
		VALUES ('expense', 'รับจำนำ', ?, ?, 'auto', ?)
	`, input.InitialPrincipal, notes, pawnedDateVal)
	if err != nil {
		return models.PawnRecord{}, fmt.Errorf("auto expense entry: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return models.PawnRecord{}, err
	}

	return h.GetPawn(int(id))
}

func (h *PawnHandler) GetPawn(id int) (models.PawnRecord, error) {
	var r models.PawnRecord
	err := db.DB.QueryRow(`
		SELECT
			pr.id, pr.ticket_number, pr.customer_id,
			COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, 'ไม่พบข้อมูลลูกค้า') AS customer_name,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.principal_amount AS initial_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.redeemed_at, pr.forfeited_at, pr.created_at,
			COALESCE(
				(SELECT pc.new_principal FROM principal_changes pc
				 WHERE pc.pawn_record_id = pr.id
				 ORDER BY pc.date DESC, pc.id DESC LIMIT 1),
				pr.principal_amount
			) AS current_principal
		FROM pawn_records pr
		LEFT JOIN customers c ON c.id = pr.customer_id
		WHERE pr.id = ?
	`, id).Scan(
		&r.ID, &r.TicketNumber, &r.CustomerID,
		&r.CustomerName, &r.ItemType, &r.WeightGrams, &r.Description,
		&r.PawnedDate, &r.InitialPrincipal,
		&r.MonthlyInterestRate, &r.InterestAmount,
		&r.Status, &r.TicketStatus, &r.RedeemedAt, &r.ForfeitedAt, &r.CreatedAt,
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
			COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, 'ไม่พบข้อมูลลูกค้า') AS customer_name,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.principal_amount AS initial_principal,
			COALESCE(
				(SELECT pc.new_principal FROM principal_changes pc
				 WHERE pc.pawn_record_id = pr.id
				 ORDER BY pc.date DESC, pc.id DESC LIMIT 1),
				pr.principal_amount
			) AS current_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.redeemed_at, pr.forfeited_at, pr.created_at,
			(SELECT pp.month FROM pawn_payments pp
			 WHERE pp.pawn_record_id = pr.id
			 ORDER BY pp.year DESC, pp.month DESC LIMIT 1) AS last_paid_month,
			(SELECT pp.year FROM pawn_payments pp
			 WHERE pp.pawn_record_id = pr.id
			 ORDER BY pp.year DESC, pp.month DESC LIMIT 1) AS last_paid_year
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
			&item.RedeemedAt, &item.ForfeitedAt, &item.CreatedAt,
			&item.LastPaidMonth, &item.LastPaidYear,
		)
		if err != nil {
			return nil, fmt.Errorf("scan pawn list: %w", err)
		}
		list = append(list, item)
	}
	return list, nil
}

// AddPrincipalChange logs a reduction or increase and updates the pawn's
// stored interest_amount to reflect the new principal.
func (h *PawnHandler) AddPrincipalChange(input models.PrincipalChangeInput) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	dateVal := input.Date
	if dateVal == "" {
		dateVal = time.Now().Format("2006-01-02")
	}
	if len(dateVal) == 10 {
		dateVal = dateVal + " " + time.Now().Format("15:04:05")
	}

	// 1. Insert the change record
	_, err = tx.Exec(`
		INSERT INTO principal_changes
		  (pawn_record_id, date, change_type, amount, new_principal, notes)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		input.PawnRecordID,
		dateVal,
		input.ChangeType,
		input.Amount,
		input.NewPrincipal,
		input.Notes,
	)
	if err != nil {
		return fmt.Errorf("insert principal change: %w", err)
	}

	// 2. Update the pawn's stored interest values so receipts / display stay correct
	_, err = tx.Exec(`
		UPDATE pawn_records
		SET monthly_interest_rate = ?, interest_amount = ?
		WHERE id = ?
	`, input.NewInterestRate, input.NewInterestAmount, input.PawnRecordID)
	if err != nil {
		return fmt.Errorf("update pawn interest: %w", err)
	}

	// 3. Auto-log as income/expense
	var ticketNumber int
	var customerName string
	err = tx.QueryRow(`
		SELECT pr.ticket_number, COALESCE(c.prefix || ' ' || c.firstname || ' ' || c.lastname, 'ไม่พบข้อมูลลูกค้า')
		FROM pawn_records pr
		LEFT JOIN customers c ON c.id = pr.customer_id
		WHERE pr.id = ?
	`, input.PawnRecordID).Scan(&ticketNumber, &customerName)
	if err == nil {
		ieType := "income"
		category := "ลดต้นจำนำ"
		desc := fmt.Sprintf("ลดต้นจำนำ ตั๋ว %04d (%s)", ticketNumber, customerName)
		
		if input.ChangeType == "increase" {
			ieType = "expense"
			category = "เพิ่มต้นจำนำ"
			desc = fmt.Sprintf("เพิ่มต้นจำนำ ตั๋ว %04d (%s)", ticketNumber, customerName)
		} else if input.NewPrincipal == 0 {
			category = "ไถ่ถอน"
			desc = fmt.Sprintf("ไถ่ถอน ตั๋ว %04d (%s)", ticketNumber, customerName)
		}
		
		_, err = tx.Exec(`
			INSERT INTO income_expenses (type, category, amount, notes, source, date)
			VALUES (?, ?, ?, ?, 'auto', ?)
		`, ieType, category, input.Amount, desc, dateVal)
		if err != nil {
			return fmt.Errorf("auto income/expense: %w", err)
		}
	}

	return tx.Commit()
}

// GetPrincipalChanges returns the full change log for a pawn, oldest first.
func (h *PawnHandler) GetPrincipalChanges(pawnRecordID int) ([]models.PrincipalChange, error) {
	rows, err := db.DB.Query(`
		SELECT id, pawn_record_id, date, change_type, amount, new_principal, notes
		FROM principal_changes
		WHERE pawn_record_id = ?
		ORDER BY date ASC, id ASC
	`, pawnRecordID)
	if err != nil {
		return nil, fmt.Errorf("get principal changes: %w", err)
	}
	defer rows.Close()

	var list []models.PrincipalChange
	for rows.Next() {
		var c models.PrincipalChange
		if err := rows.Scan(
			&c.ID, &c.PawnRecordID, &c.Date, &c.ChangeType,
			&c.Amount, &c.NewPrincipal, &c.Notes,
		); err != nil {
			return nil, fmt.Errorf("scan change: %w", err)
		}
		list = append(list, c)
	}
	return list, nil
}

// UpdatePawnDescription updates only the description note of a pawn record
func (h *PawnHandler) UpdatePawnDescription(id int, description string) error {
	_, err := db.DB.Exec(`UPDATE pawn_records SET description = ? WHERE id = ?`, description, id)
	return err
}

// UpdatePawnInterest updates the monthly interest rate and interest amount for a pawn record.
func (h *PawnHandler) UpdatePawnInterest(id int, rate float64, amount float64) error {
	_, err := db.DB.Exec(`
		UPDATE pawn_records
		SET monthly_interest_rate = ?, interest_amount = ?
		WHERE id = ?
	`, rate, amount, id)
	return err
}

// CheckTicketNumberExists checks if a ticket number is already taken by an active pawn.
func (h *PawnHandler) CheckTicketNumberExists(ticketNumber int) (bool, error) {
	var count int
	err := db.DB.QueryRow(`
		SELECT COUNT(*) FROM pawn_records 
		WHERE ticket_number = ? AND status = 'active'
	`, ticketNumber).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("check ticket number: %w", err)
	}
	return count > 0, nil
}

// UpdateTicketNumber changes a pawn's ticket number and logs the change.
func (h *PawnHandler) UpdateTicketNumber(pawnRecordID int, newTicketNumber int) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Validate if ticket number is already taken by an active pawn
	var count int
	err = tx.QueryRow(`
		SELECT COUNT(*) FROM pawn_records 
		WHERE ticket_number = ? AND status = 'active' AND id != ?
	`, newTicketNumber, pawnRecordID).Scan(&count)
	if err != nil {
		return fmt.Errorf("check active ticket number: %w", err)
	}
	if count > 0 {
		return fmt.Errorf("ไม่สามารถใช้เลขตั๋ว %d ได้เนื่องจากมีรายการที่ยังไม่ไถ่ถอนใช้เลขนี้อยู่", newTicketNumber)
	}

	// Fetch old ticket number
	var oldTicketNumber int
	err = tx.QueryRow(`SELECT ticket_number FROM pawn_records WHERE id = ?`, pawnRecordID).Scan(&oldTicketNumber)
	if err != nil {
		return fmt.Errorf("get old ticket number: %w", err)
	}

	// Update the ticket number
	_, err = tx.Exec(`UPDATE pawn_records SET ticket_number = ? WHERE id = ?`, newTicketNumber, pawnRecordID)
	if err != nil {
		return fmt.Errorf("update ticket number: %w", err)
	}

	// Log the change
	_, err = tx.Exec(`
		INSERT INTO ticket_number_logs (pawn_record_id, old_ticket_number, new_ticket_number)
		VALUES (?, ?, ?)
	`, pawnRecordID, oldTicketNumber, newTicketNumber)
	if err != nil {
		return fmt.Errorf("insert ticket number log: %w", err)
	}

	// Optionally update the global last_ticket_number if the new one is greater
	var raw string
	err = tx.QueryRow(`SELECT value FROM settings WHERE key = 'last_ticket_number'`).Scan(&raw)
	if err == nil {
		lastTicket, _ := strconv.Atoi(raw)
		if newTicketNumber > lastTicket {
			_, _ = tx.Exec(`UPDATE settings SET value = ? WHERE key = 'last_ticket_number'`, strconv.Itoa(newTicketNumber))
		}
	}

	return tx.Commit()
}

// GetTicketNumberLogs retrieves the log history for a pawn's ticket numbers.
func (h *PawnHandler) GetTicketNumberLogs(pawnRecordID int) ([]models.TicketNumberLog, error) {
	rows, err := db.DB.Query(`
		SELECT id, pawn_record_id, old_ticket_number, new_ticket_number, changed_at
		FROM ticket_number_logs
		WHERE pawn_record_id = ?
		ORDER BY changed_at DESC, id DESC
	`, pawnRecordID)
	if err != nil {
		return nil, fmt.Errorf("get ticket number logs: %w", err)
	}
	defer rows.Close()

	var logs []models.TicketNumberLog
	for rows.Next() {
		var l models.TicketNumberLog
		if err := rows.Scan(&l.ID, &l.PawnRecordID, &l.OldTicketNumber, &l.NewTicketNumber, &l.ChangedAt); err != nil {
			return nil, fmt.Errorf("scan log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}

