package db

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(dbPath string) {
	var err error
	DB, err = sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	createTables()
	runMigrations()
	log.Println("Database initialized successfully")
}



func createTables() {
	// Create schema_migrations table if not exists
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY
		)
	`)
	if err != nil {
		log.Fatal("Failed to create schema_migrations table:", err)
	}

	// Ensure tables exist
	queries := []string{

		// Customers
		`CREATE TABLE IF NOT EXISTS customers (
			id              INTEGER PRIMARY KEY AUTOINCREMENT,
			prefix          TEXT,
			firstname       TEXT NOT NULL,
			lastname        TEXT NOT NULL,
			phone           TEXT,
			id_card         TEXT UNIQUE,
			address_no      TEXT,
			address_line    TEXT,
			moo             TEXT,
			soi             TEXT,
			road            TEXT,
			tambon          TEXT,
			amphoe          TEXT,
			province        TEXT,
			created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Gold stock catalog (no longer per item but per type/purity/weight)
		`CREATE TABLE IF NOT EXISTS gold_stock (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			type          TEXT NOT NULL,
			subtype       TEXT NOT NULL,
			purity        TEXT NOT NULL,
			weight_grams  REAL NOT NULL,
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Gold monthly stock counts
		`CREATE TABLE IF NOT EXISTS gold_stock_logs (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			gold_item_id INTEGER NOT NULL,
			amount       INTEGER NOT NULL DEFAULT 0,
			log_date     DATE NOT NULL,
			created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (gold_item_id) REFERENCES gold_stock(id),
			UNIQUE(gold_item_id, log_date)
		)`,

		// Purchased gold ledger from customers (no purity, no price_per_baht)
		`CREATE TABLE IF NOT EXISTS purchased_gold (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_id    INTEGER NOT NULL,
			type           TEXT NOT NULL,
			weight_grams   REAL DEFAULT 0.0,
			total_amount   REAL NOT NULL DEFAULT 0,
			notes          TEXT,
			date           DATE NOT NULL,
			is_inventory   INTEGER DEFAULT 0,
			still_exists   INTEGER DEFAULT 1,
			created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (customer_id) REFERENCES customers(id)
		)`,

		// Daily gold price
		`CREATE TABLE IF NOT EXISTS gold_prices (
			id                  INTEGER PRIMARY KEY AUTOINCREMENT,
			date                DATE NOT NULL,
			update_time         TEXT UNIQUE,
			buy_price_per_baht  REAL DEFAULT 0,
			sell_price_per_baht REAL DEFAULT 0,
			om_buy_price        REAL DEFAULT 0,
			om_sell_price       REAL DEFAULT 0,
			fetched_at          DATETIME
		)`,



		// Pawn records (grams for weight)
		`CREATE TABLE IF NOT EXISTS pawn_records (
			id                    INTEGER PRIMARY KEY AUTOINCREMENT,
			ticket_number         INTEGER NOT NULL,
			customer_id           INTEGER NOT NULL,
			item_type             TEXT NOT NULL,
			weight_grams          REAL NOT NULL DEFAULT 0.0,
			description           TEXT,
			pawned_date           DATE NOT NULL,
			principal_amount      REAL NOT NULL,
			monthly_interest_rate REAL NOT NULL,
			interest_amount       REAL NOT NULL,
			ticket_status         TEXT DEFAULT 'active',
			status                TEXT DEFAULT 'active',
			created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (customer_id) REFERENCES customers(id)
		)`,

		// Monthly pawn payments
		`CREATE TABLE IF NOT EXISTS pawn_payments (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			pawn_record_id INTEGER NOT NULL,
			month          INTEGER NOT NULL,
			year           INTEGER NOT NULL,
			paid_date      DATE NOT NULL,
			notes          TEXT,
			FOREIGN KEY (pawn_record_id) REFERENCES pawn_records(id)
		)`,

		// Principal reductions
		`CREATE TABLE IF NOT EXISTS principal_changes (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			pawn_record_id INTEGER NOT NULL,
			date           DATE NOT NULL,
			change_type    TEXT NOT NULL,
			amount         REAL NOT NULL,
			new_principal  REAL NOT NULL,
			notes          TEXT,
			FOREIGN KEY (pawn_record_id) REFERENCES pawn_records(id)
		)`,

		// Income and expenses
		`CREATE TABLE IF NOT EXISTS income_expenses (
			id               INTEGER PRIMARY KEY AUTOINCREMENT,
			type             TEXT NOT NULL,
			category         TEXT,
			amount           REAL NOT NULL,
			notes            TEXT,
			source           TEXT DEFAULT 'manual',
			is_bank_transfer INTEGER DEFAULT 0,
			date             DATE NOT NULL,
			created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Daily in-store money balance logs
		`CREATE TABLE IF NOT EXISTS daily_cash (
			date               DATE PRIMARY KEY,
			last_record_date   DATE,
			amount_last_record REAL NOT NULL DEFAULT 0.0,
			expected_amount    REAL NOT NULL DEFAULT 0.0,
			actual_amount      REAL NOT NULL DEFAULT 0.0,
			notes              TEXT,
			created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// App settings (key-value)
		`CREATE TABLE IF NOT EXISTS settings (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)`,

		// Seed default settings
		`INSERT OR IGNORE INTO settings (key, value) VALUES
			('shop_name',            'ห้างทองแต้ยืนยง'),
			('shop_address',         '332/1 ถ.เชียงใหม่-ลำพูน ต.วัตเกต อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50000'),
			('shop_phone',           '053-140-935'),
			('buying_difference',    '0'),
			('interest_rate_low',    '0.03'),
			('interest_rate_high',   '0.02'),
			('interest_threshold',   '10000'),
			('min_interest_amount',  '20'),
			('last_ticket_number',   '0'),
			('promptpay_number',     ''),
			('promptpay_name',       ''),
			('pawn_legal_terms',     'ข้่าพเจ้าขอรับรองว่าทรัพย์สินดั่งกล่าวเป็นของข้าพเจ้าจริงไม่ใช่ทรัพย์สินที่ได้มาจากการกระทำผิดใดๆ ทั้งสิ้น และ <bold><underline> จะมาถอนภายในกำหนด หนึ่ง เดือน </underline></bold> หากพ้นกำหนดนี้แล้ว ข้าพเจ้ายินยอมให้กรรมสิทธิในทรัพสินดังกล่าวเป็นกรรมสิทธิของทางร้าน ข้าพเจ้าได้อ่านสัญญาดีแล้วจึงลงลายมือไว้เป็นหลักฐาน'),
			('income_expense_presets', '[{"name":"ดอกเบี้ยจำนำ","type":"income","color":"#2ecc71"},{"name":"ขายทอง","type":"income","color":"#f1c40f"},{"name":"ค่าบริการ","type":"income","color":"#3498db"},{"name":"อื่นๆ","type":"income","color":"#95a5a6"},{"name":"รับซื้อทอง","type":"expense","color":"#e67e22"},{"name":"ค่าเช่า","type":"expense","color":"#e74c3c"},{"name":"ค่าสาธารณูปโภค","type":"expense","color":"#9b59b6"},{"name":"เงินเดือน","type":"expense","color":"#1abc9c"},{"name":"ค่าใช้จ่ายทั่วไป","type":"expense","color":"#34495e"},{"name":"อื่นๆ","type":"expense","color":"#7f8c8d"}]')
		`,

		// Indexes for DATETIME and DATE columns
		`CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_gold_stock_created_at ON gold_stock(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_gold_stock_logs_log_date ON gold_stock_logs(log_date)`,
		`CREATE INDEX IF NOT EXISTS idx_gold_stock_logs_created_at ON gold_stock_logs(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_purchased_gold_date ON purchased_gold(date)`,
		`CREATE INDEX IF NOT EXISTS idx_purchased_gold_created_at ON purchased_gold(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_gold_prices_date ON gold_prices(date)`,
		`CREATE INDEX IF NOT EXISTS idx_pawn_records_pawned_date ON pawn_records(pawned_date)`,
		`CREATE INDEX IF NOT EXISTS idx_pawn_records_created_at ON pawn_records(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_pawn_records_status ON pawn_records(status)`,
		`CREATE INDEX IF NOT EXISTS idx_pawn_payments_paid_date ON pawn_payments(paid_date)`,
		`CREATE INDEX IF NOT EXISTS idx_principal_changes_date ON principal_changes(date)`,
		`CREATE INDEX IF NOT EXISTS idx_income_expenses_date ON income_expenses(date)`,
		`CREATE INDEX IF NOT EXISTS idx_income_expenses_created_at ON income_expenses(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_daily_cash_last_record_date ON daily_cash(last_record_date)`,
		`CREATE INDEX IF NOT EXISTS idx_daily_cash_created_at ON daily_cash(created_at)`,
	}

	for _, query := range queries {
		_, err := DB.Exec(query)
		if err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}
}

func runMigrations() {
	migrations := []struct {
		Version int
		Query   string
		Desc    string
	}{
		{1, "ALTER TABLE gold_stock ADD COLUMN no_purity INTEGER NOT NULL DEFAULT 0", "Add no_purity to gold_stock"},
		{2, "ALTER TABLE gold_stock ADD COLUMN no_weight INTEGER NOT NULL DEFAULT 0", "Add no_weight to gold_stock"},
		{3, "ALTER TABLE income_expenses ADD COLUMN is_bank_transfer INTEGER DEFAULT 0", "Add is_bank_transfer to income_expenses"},
		{4, "ALTER TABLE gold_prices ADD COLUMN fetched_at DATETIME", "Add fetched_at to gold_prices"},
		{5, "ALTER TABLE gold_prices ADD COLUMN fetched_at DATETIME", "Retry adding fetched_at to gold_prices (fix for v4)"},
		{6, "UPDATE gold_prices SET fetched_at = date || ' 00:00:00' WHERE fetched_at IS NULL", "Backfill fetched_at with date"},
	}

	for _, m := range migrations {
		var exists bool
		err := DB.QueryRow("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=?)", m.Version).Scan(&exists)
		if err != nil {
			log.Fatal("Failed to check migration version:", err)
		}
		if !exists {
			_, err := DB.Exec(m.Query)
			if err != nil {
				// If the column already exists, treat it as successful
				if err.Error() == "duplicate column name: no_purity" ||
					err.Error() == "duplicate column name: no_weight" ||
					err.Error() == "duplicate column name: is_bank_transfer" ||
					err.Error() == "duplicate column name: fetched_at" {
					DB.Exec("INSERT INTO schema_migrations (version) VALUES (?)", m.Version)
					log.Printf("Applied migration %d: %s (column already existed)", m.Version, m.Desc)
				} else {
					log.Printf("ERROR: Failed to run migration %d (%s): %v", m.Version, m.Desc, err)
					// Note: we do NOT insert into schema_migrations, so it will retry next time.
				}
			} else {
				DB.Exec("INSERT INTO schema_migrations (version) VALUES (?)", m.Version)
				log.Printf("Applied migration %d: %s", m.Version, m.Desc)
			}
		}
	}
}