/**
 * Compute pending (unpaid) interest months for a pawn.
 *
 * Supports two usage modes:
 * 1. Full payments array (e.g., PawnDetail):  getPendingMonths(pawn, payments)
 * 2. Pawn with last_paid_month/year (e.g., PawnList):  getPendingMonths(pawn)
 *
 * @param {Object} pawn - A pawn record (must have `pawned_date`, `status`, optionally `last_paid_month`/`last_paid_year`)
 * @param {Array}  [payments] - Array of payment objects (each with `month` 1-12 and `year` in CE)
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

  // 2. Determine the latest paid month/year
  //    Priority: full payments array > pawn.last_paid_month/year > pawn date
  if (payments && payments.length > 0) {
    const sorted = [...payments].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })
    latestMonth = sorted[0].month - 1   // Convert 1-12 to 0-11
    latestYear  = sorted[0].year
  } else if (pawn.last_paid_month != null && pawn.last_paid_year != null) {
    latestMonth = pawn.last_paid_month - 1  // Convert 1-12 to 0-11
    latestYear  = pawn.last_paid_year
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
