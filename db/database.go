package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init(dbPath string) {
	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	createTables()
	log.Println("Database initialized successfully")
}



func createTables() {
	// Drop old income_expense table if it exists (one-time truncation/rename)
	var oldTableExists bool
	err := DB.QueryRow("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='income_expense')").Scan(&oldTableExists)
	if err == nil && oldTableExists {
		_, err = DB.Exec("DROP TABLE income_expense")
		if err != nil {
			log.Println("Warning: Failed to drop old income_expense table:", err)
		} else {
			log.Println("Dropped old income_expense table successfully")
		}
	}

	// Drop old daily_cash table if it has amount_yesterday
	var hasAmountYesterday bool
	rows, err := DB.Query("PRAGMA table_info(daily_cash)")
	if err == nil {
		for rows.Next() {
			var cid int
			var name, ctype string
			var notnull, pk int
			var dfltVal interface{}
			if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltVal, &pk); err == nil {
				if name == "amount_yesterday" {
					hasAmountYesterday = true
				}
			}
		}
		rows.Close()
	}
	if hasAmountYesterday {
		_, err = DB.Exec("DROP TABLE daily_cash")
		if err != nil {
			log.Println("Warning: Failed to drop old daily_cash table:", err)
		} else {
			log.Println("Dropped old daily_cash table successfully")
		}
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
			subtype        TEXT,
			weight_baht    REAL NOT NULL,
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
			om_sell_price       REAL DEFAULT 0
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
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			type       TEXT NOT NULL,
			category   TEXT,
			amount     REAL NOT NULL,
			notes      TEXT,
			source     TEXT DEFAULT 'manual',
			date       DATE NOT NULL,
			color      TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
			('buy_price_per_baht',   '0'),
			('sell_price_per_baht',  '0'),
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
	}

	for _, query := range queries {
		_, err := DB.Exec(query)
		if err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}

	// Migrations: Alter tables to add columns if they don't exist
	alterQueries := []string{
		`ALTER TABLE purchased_gold ADD COLUMN subtype TEXT`,
		`ALTER TABLE purchased_gold ADD COLUMN weight_grams REAL DEFAULT 0.0`,
		`ALTER TABLE income_expenses ADD COLUMN color TEXT`,
	}
	for _, query := range alterQueries {
		// Ignore error if column already exists
		_, _ = DB.Exec(query)
	}
}