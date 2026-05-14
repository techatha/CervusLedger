/**
 * Compute pending (unpaid) interest months for a pawn.
 *
 * @param {Object} pawn - A pawn record object (must have `pawned_date` and `status`)
 * @param {Array}  payments - Array of payment objects (each with `month` 1-12 and `year` in CE)
 * @returns {Array<{month: number, year: number}>} Pending months (month 1-12, year CE)
 */
export function getPendingMonths(pawn, payments = []) {
  if (!pawn || pawn.status !== 'active' || !pawn.pawned_date) return []

  // 1. Get today's date and strip time to exactly 00:00:00
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pawnDate = new Date(pawn.pawned_date)
  pawnDate.setHours(0, 0, 0, 0)
  const dueDay = pawnDate.getDate()

  // Default to the pawn date if no payments exist
  let latestMonth = pawnDate.getMonth()       // 0-indexed (0-11)
  let latestYear  = pawnDate.getFullYear()    // CE year

  // 2. Get the latest year/month from payments (handles unsorted data)
  if (payments && payments.length > 0) {
    // Sort descending (highest year first, then highest month)
    const sorted = [...payments].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })

    const latestPayment = sorted[0]
    latestMonth = latestPayment.month - 1   // Convert 1-12 to 0-11 for JS Date
    latestYear  = latestPayment.year        // DB is CE, so we use it directly
  }

  const pending = []

  // Start checking from the month AFTER the latest paid month
  let checkMonth = latestMonth + 1
  let checkYear  = latestYear

  // 3. Loop and calculate differences month-by-month
  while (true) {
    // Handle December -> January rollover
    if (checkMonth > 11) {
      checkMonth = 0
      checkYear++
    }

    // Handle months that don't have enough days (e.g., pawned on 31st, checking Feb)
    const maxDaysInCheckMonth = new Date(checkYear, checkMonth + 1, 0).getDate()
    const actualDueDay = Math.min(dueDay, maxDaysInCheckMonth)

    // Define this specific month's due date: [day of pawn]/[check month]/[check year]
    const checkDueDate = new Date(checkYear, checkMonth, actualDueDay)
    checkDueDate.setHours(0, 0, 0, 0)

    // If today is before this due date, stop. We only want unpaid months that have passed.
    if (today < checkDueDate) {
      break
    }

    // Push the unpaid month into the array
    pending.push({
      month: checkMonth + 1,  // Convert 0-11 back to 1-12 for UI
      year: checkYear         // Returns CE year (UI handles `m.year + 543`)
    })

    // Move to the next month for the next loop iteration
    checkMonth++
  }

  return pending
}

/**
 * Short Thai month names (1-indexed: index 1 = ม.ค., index 12 = ธ.ค.)
 */
const SHORT_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/**
 * Get short Thai month name for a 1-indexed month number.
 * @param {number} m - Month number (1-12)
 * @returns {string} Short Thai month name
 */
export function thaiMonthShort(m) {
  return SHORT_MONTHS[m] || m
}
