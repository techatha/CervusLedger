package handlers

import (
	"context"
	"fmt"
	"time"

	"CervusLedger/db"
	"CervusLedger/models"
)

type DashboardHandler struct {
	ctx context.Context
}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func (h *DashboardHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}


func(h *DashboardHandler) GetDashboardStats() (models.DashboardStats, error) {
	var s models.DashboardStats
	today := time.Now().Format("2006-01-02")
	month := time.Now().Format("01")
	year  := time.Now().Format("2006")
	monthStart := fmt.Sprintf("%s-%s-01", year, month)
	monthEnd   := fmt.Sprintf("%s-%s-%02d", year, month, daysInMonth())

	// ── Gold price ──────────────────────────────────────────────────
	gpH := NewGoldPriceHandler()
	price, err := gpH.GetTodayPrice()
	if err == nil {
		s.TodayPrice = price
	}

	// ── Active pawn count + total principal ─────────────────────────
	db.DB.QueryRow(`
		SELECT
			COUNT(*),
			COALESCE(SUM(
				COALESCE((
					SELECT pc.new_principal FROM principal_changes pc
					WHERE pc.pawn_record_id = pr.id
					ORDER BY pc.date DESC, pc.id DESC LIMIT 1
				), pr.initial_principal)
			), 0)
		FROM pawn_records pr
		WHERE pr.status = 'active'
	`).Scan(&s.ActivePawnCount, &s.ActivePawnPrincipal)

	// ── Paid / unpaid this month (active pawns only) ─────────────────
	db.DB.QueryRow(`
		SELECT COUNT(*) FROM pawn_records pr
		WHERE pr.status = 'active'
		AND EXISTS (
			SELECT 1 FROM pawn_payments pp
			WHERE pp.pawn_record_id = pr.id
			  AND pp.month = CAST(? AS INTEGER)
			  AND pp.year  = CAST(? AS INTEGER)
		)
	`, time.Now().Month(), time.Now().Year()).Scan(&s.PaidThisMonth)

	s.UnpaidThisMonth = s.ActivePawnCount - s.PaidThisMonth

	// ── Today income / expense ──────────────────────────────────────
	db.DB.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0),
			COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)
		FROM income_expenses WHERE date = ?
	`, today).Scan(&s.TodayIncome, &s.TodayExpense)

	// ── New pawns today ─────────────────────────────────────────────
	db.DB.QueryRow(`SELECT COUNT(*) FROM pawn_records WHERE DATE(created_at) = ?`, today).
		Scan(&s.TodayNewPawns)

	// ── Interest collected this month ───────────────────────────────
	db.DB.QueryRow(`
		SELECT COALESCE(SUM(amount),0) FROM income_expenses
		WHERE type='income' AND category='ดอกเบี้ยจำนำ'
		  AND date >= ? AND date <= ?
	`, monthStart, monthEnd).Scan(&s.MonthInterestCollected)

	// ── Recent 5 active pawns ───────────────────────────────────────
	rows, err := db.DB.Query(`
		SELECT
			pr.id, pr.ticket_number, pr.customer_id,
			(c.prefix||' '||c.firstname||' '||c.lastname) AS customer_name,
			pr.item_type, pr.weight_grams, pr.description,
			pr.pawned_date, pr.initial_principal,
			COALESCE((
				SELECT pc.new_principal FROM principal_changes pc
				WHERE pc.pawn_record_id = pr.id
				ORDER BY pc.date DESC, pc.id DESC LIMIT 1
			), pr.initial_principal) AS current_principal,
			pr.monthly_interest_rate, pr.interest_amount,
			pr.status, pr.ticket_status, pr.created_at
		FROM pawn_records pr
		LEFT JOIN customers c ON c.id = pr.customer_id
		WHERE pr.status = 'active'
		ORDER BY pr.id DESC LIMIT 5
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var item models.PawnRecord
			rows.Scan(
				&item.ID, &item.TicketNumber, &item.CustomerID,
				&item.CustomerName, &item.ItemType, &item.WeightGrams,
				&item.Description, &item.PawnedDate, &item.InitialPrincipal,
				&item.CurrentPrincipal, &item.MonthlyInterestRate,
				&item.InterestAmount, &item.Status, &item.TicketStatus,
				&item.CreatedAt,
			)
			s.RecentPawns = append(s.RecentPawns, item)
		}
	}

	// ── Recent 8 income/expense entries ────────────────────────────
	rows2, err := db.DB.Query(`
		SELECT id, type, category, amount, notes, source, date, created_at
		FROM income_expenses ORDER BY date DESC, id DESC LIMIT 8
	`)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var e models.IncomeExpense
			rows2.Scan(&e.ID, &e.Type, &e.Category, &e.Amount,
				&e.Notes, &e.Source, &e.Date, &e.CreatedAt)
			s.RecentActivity = append(s.RecentActivity, e)
		}
	}

	return s, nil
}

func daysInMonth() int {
	now := time.Now()
	return time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.Local).Day()
}
