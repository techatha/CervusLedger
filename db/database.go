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
			road            TEXT,
			tambon          TEXT,
			amphoe          TEXT,
			province        TEXT,
			created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// Gold inventory (baht weight)
		`CREATE TABLE IF NOT EXISTS gold_items (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			type        TEXT NOT NULL,
			weight_baht REAL NOT NULL,
			purity      TEXT,
			description TEXT,
			status      TEXT DEFAULT 'available',
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
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
		`CREATE TABLE IF NOT EXISTS income_expense (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			type       TEXT NOT NULL,
			category   TEXT,
			amount     REAL NOT NULL,
			notes      TEXT,
			source     TEXT DEFAULT 'manual',
			date       DATE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
			('interest_rate_low',    '0.03'),
			('interest_rate_high',   '0.02'),
			('interest_threshold',   '10000'),
			('min_interest_amount',  '20'),
			('last_ticket_number',   '0'),
			('promptpay_number',     ''),
			('promptpay_name',       '')
		`,
	}

	for _, query := range queries {
		_, err := DB.Exec(query)
		if err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}
}