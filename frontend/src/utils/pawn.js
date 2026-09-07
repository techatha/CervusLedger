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
export function getLatestPaidMonth(pawn, payments = []) {
  if (!pawn || !pawn.pawned_date) return null
  
  const pawnDate = new Date(pawn.pawned_date)
  let latestMonth = pawnDate.getMonth()       // 0-indexed (0-11)
  let latestYear  = pawnDate.getFullYear()    // CE year

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

  return { month: latestMonth, year: latestYear }
}

/**
 * Gap-aware pending months: lists ALL unpaid months from pawn start to today.
 *
 * When a full payments array is provided, checks every month individually,
 * supporting gaps (e.g., month 3 paid, month 4 cancelled/unpaid, month 5 paid).
 *
 * When only last_paid_month/year is available (list view), falls back to
 * the sequential "everything after last paid" logic.
 */
export function getPendingMonths(pawn, payments = []) {
  if (!pawn || pawn.status !== 'active' || !pawn.pawned_date) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pawnDate = new Date(pawn.pawned_date)
  pawnDate.setHours(0, 0, 0, 0)
  const dueDay = pawnDate.getDate()

  // Build a Set of paid months for O(1) lookup: "YYYY-M"
  const paidSet = new Set()
  const hasFullPayments = payments && payments.length > 0

  if (hasFullPayments) {
    payments.forEach(p => paidSet.add(`${p.year}-${p.month}`))
  }

  // Step 1: List ALL months from next month after pawn date to today
  const allMonths = []
  let checkMonth = pawnDate.getMonth() + 1 // 0-indexed (starts from next month)
  let checkYear = pawnDate.getFullYear()

  while (true) {
    if (checkMonth > 11) { checkMonth = 0; checkYear++ }

    const maxDays = new Date(checkYear, checkMonth + 1, 0).getDate()
    const actualDueDay = Math.min(dueDay, maxDays)
    const dueDate = new Date(checkYear, checkMonth, actualDueDay)
    dueDate.setHours(0, 0, 0, 0)

    if (today < dueDate) break

    allMonths.push({ month: checkMonth + 1, year: checkYear }) // 1-indexed month
    checkMonth++
  }

  // Step 2: Remove paid months
  if (hasFullPayments) {
    // Gap-aware: filter out only the paid months
    return allMonths.filter(m => !paidSet.has(`${m.year}-${m.month}`))
  }

  // Fallback for list view: use last_paid_month/year as cutoff (no gap detection)
  if (pawn.last_paid_month != null && pawn.last_paid_year != null) {
    return allMonths.filter(m => {
      // Keep only months after the last paid month
      if (m.year > pawn.last_paid_year) return true
      if (m.year === pawn.last_paid_year && m.month > pawn.last_paid_month) return true
      return false
    })
  }

  // No payments at all — all months are pending
  return allMonths
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
