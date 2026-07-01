package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"CervusLedger/db"
)

func main() {
	homeDir, _ := os.UserHomeDir()
	dbPath := homeDir + "/CervusLedger/data.db"
	os.MkdirAll(homeDir+"/CervusLedger", 0755)

	fmt.Println("Wiping out existing database to re-initialize from scratch...")
	if f, err := os.OpenFile(dbPath, os.O_WRONLY|os.O_TRUNC, 0666); err == nil {
		f.Close()
	}

	db.Init(dbPath)

	fmt.Println("Starting CSV import...")

	importCustomers("scripts/data/customers.csv")
	importPawnRecords("scripts/data/pawn_records.csv")
	importPawnPayments("scripts/data/pawn_payments.csv")
	importPrincipalChanges("scripts/data/principal_changes.csv")

	fmt.Println("Import complete!")
}

// Convert Thai Buddhist Era date to CE
// Input: "2568-01-15" → Output: "2025-01-15"
func thaiToCE(thaiDate string) string {
	thaiDate = strings.TrimSpace(thaiDate)
	if thaiDate == "" {
		return ""
	}
	if idx := strings.IndexAny(thaiDate, "T "); idx != -1 {
		thaiDate = thaiDate[:idx]
	}
	parts := strings.Split(thaiDate, "-")
	if len(parts) != 3 {
		return thaiDate
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil {
		return thaiDate
	}
	ceYear := year - 543
	return fmt.Sprintf("%d-%s-%s", ceYear, parts[1], parts[2])
}

func importCustomers(path string) {
	file, err := os.Open(path)
	if err != nil {
		log.Printf("Skipping customers: %v", err)
		return
	}
	defer file.Close()

	records, _ := csv.NewReader(file).ReadAll()
	count := 0

	for i, row := range records {
		if i == 0 {
			continue // skip header
		}
		if len(row) < 12 {
			continue
		}

		prefix, firstname, lastname, phone, address_no, address_line, moo, road, tambon, amphoe, province := row[0], row[1], row[2], row[3], row[5], row[6], row[7], row[8], row[9], row[10], row[11]

		var idCard *string
		if row[4] != "" {
			s := row[4]
			idCard = &s
		}

		_, err := db.DB.Exec(`
			INSERT OR IGNORE INTO customers (prefix, firstname, lastname, phone, id_card, address_no, address_line, moo, road, tambon, amphoe, province)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			prefix, firstname, lastname, phone, idCard, address_no, address_line, moo, road, tambon, amphoe, province,
		)
		if err != nil {
			log.Printf("Row %d customer error: %v", i, err)
			continue
		}
		count++
	}
	fmt.Printf("Customers imported: %d\n", count)
}

func importPawnRecords(path string) {
	file, err := os.Open(path)
	if err != nil {
		log.Printf("Skipping pawn records: %v", err)
		return
	}
	defer file.Close()

	records, _ := csv.NewReader(file).ReadAll()
	count := 0

	for i, row := range records {
		if i == 0 {
			continue
		}
		if len(row) < 10 {
			log.Printf("Row %d: not enough columns, skipping", i)
			continue
		}

		ticketNumber   := row[0]
		customerIDCard := row[1]
		itemType       := row[2]
		weightGrams    := row[3]
		if weightGrams == "" { weightGrams = "0" }
		description    := row[4]
		pawnedDate     := thaiToCE(row[5])
		principal      := row[6]
		if principal == "" { principal = "0" }
		interestRate   := row[7]
		if interestRate == "" { interestRate = "0" }
		status         := row[8]
		ticketStatus   := row[9]

		principalF, _ := strconv.ParseFloat(principal, 64)
		rateF, _      := strconv.ParseFloat(interestRate, 64)
		interestAmt   := principalF * rateF / 100

		// Look up customer by ID card
		var customerID int
		err := db.DB.QueryRow(
			`SELECT id FROM customers WHERE id_card = ?`, customerIDCard,
		).Scan(&customerID)
		if err != nil {
			log.Printf("Row %d: customer not found for id_card %s", i, customerIDCard)
			continue
		}

		_, err = db.DB.Exec(`
			INSERT OR IGNORE INTO pawn_records 
			(ticket_number, customer_id, item_type, weight_grams, description,
			 pawned_date, principal_amount, interest_amount, monthly_interest_rate,
			 status, ticket_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			ticketNumber, customerID, itemType, weightGrams, description,
			pawnedDate, principal, interestAmt, interestRate,
			status, ticketStatus,
		)
		if err != nil {
			log.Printf("Row %d pawn record error: %v", i, err)
			continue
		}
		count++
	}
	fmt.Printf("Pawn records imported: %d\n", count)
}

func importPawnPayments(path string) {
    file, err := os.Open(path)
    if err != nil {
        log.Printf("Skipping pawn payments: %v", err)
        return
    }
    defer file.Close()

    records, _ := csv.NewReader(file).ReadAll()
    count := 0

    for i, row := range records {
        if i == 0 {
            continue
        }
        if len(row) < 5 {
            continue
        }

        ticketNumber := row[0]
        month        := row[1]
        year         := row[2]
        
        // Convert standalone Year from BE to CE
        if yInt, err := strconv.Atoi(year); err == nil {
            year = strconv.Itoa(yInt - 543)
        }

        paidDate     := thaiToCE(row[3])
        notes        := row[4]

        // Look up pawn record by ticket number
        var pawnID int
        err = db.DB.QueryRow(
            `SELECT id FROM pawn_records WHERE ticket_number = ?`, ticketNumber,
        ).Scan(&pawnID)
        if err != nil {
            log.Printf("Row %d: pawn record not found for ticket %s", i, ticketNumber)
            continue
        }

        _, err = db.DB.Exec(`
            INSERT INTO pawn_payments (pawn_record_id, month, year, paid_date, notes)
            VALUES (?, ?, ?, ?, ?)`,
            pawnID, month, year, paidDate, notes,
        )
        if err != nil {
            log.Printf("Row %d payment error: %v", i, err)
            continue
        }
        count++
    }
    fmt.Printf("Pawn payments imported: %d\n", count)
}

func importPrincipalChanges(path string) {
	file, err := os.Open(path)
	if err != nil {
		log.Printf("Skipping principal changes: %v", err)
		return
	}
	defer file.Close()

	records, _ := csv.NewReader(file).ReadAll()
	count := 0

	for i, row := range records {
		if i == 0 {
			continue
		}
		if len(row) < 6 {
			continue
		}

		ticketNumber  := row[0]
		date          := thaiToCE(row[1])
		change_type   := row[2]
		amount        := row[3]
		if amount == "" { amount = "0" }
		new_principal := row[4]
		if new_principal == "" { new_principal = "0" }
		notes         := row[5]

		var pawnID int
		err := db.DB.QueryRow(
			`SELECT id FROM pawn_records WHERE ticket_number = ?`, ticketNumber,
		).Scan(&pawnID)
		if err != nil {
			log.Printf("Row %d: pawn record not found for ticket %s", i, ticketNumber)
			continue
		}

		_, err = db.DB.Exec(`
			INSERT INTO principal_changes 
			(pawn_record_id, date, change_type, amount, new_principal, notes)
			VALUES (?, ?, ?, ?, ?, ?)`,
			pawnID, date, change_type, amount, new_principal, notes,
		)
		if err != nil {
			log.Printf("Row %d reduction error: %v", i, err)
			continue
		}
		count++
	}
	fmt.Printf("Principal reductions imported: %d\n", count)
}
