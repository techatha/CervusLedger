import { useMemo } from 'react'
import { formatBaht } from '@/utils/thai'
import './CalendarGrid.css'

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/**
 * CalendarGrid — monthly calendar with integrated month nav and daily summaries.
 *
 * @param {number}   year         - Full year (e.g. 2026)
 * @param {number}   month        - 0-indexed month (0 = Jan)
 * @param {Array}    entries      - All income/expense entries for the month
 * @param {string|null} selectedDate - Currently selected date (YYYY-MM-DD) or null
 * @param {Function} onSelectDate - Callback when a day cell is clicked
 * @param {Function} onPrevMonth  - Go to previous month
 * @param {Function} onNextMonth  - Go to next month
 * @param {Function} onYearChange - Callback(year) when year dropdown changes
 * @param {Function} onMonthChange - Callback(month) when month dropdown changes
 * @param {Array}    yearOptions  - Array of year numbers for dropdown
 * @param {Array}    thaiMonths   - Array of Thai month name strings
 */
export default function CalendarGrid({
  year, month, entries, selectedDate, onSelectDate,
  onPrevMonth, onNextMonth, onYearChange, onMonthChange,
  yearOptions, thaiMonths, onToday,
}) {
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  // Build a map: "YYYY-MM-DD" → { income, expense }
  const dailyMap = useMemo(() => {
    const map = {}
      ; (entries || []).forEach(e => {
        const key = e.date?.slice(0, 10)
        if (!key) return
        if (!map[key]) map[key] = { income: 0, expense: 0 }
        if (e.type === 'income') {
          map[key].income += e.amount || 0
        } else {
          map[key].expense += e.amount || 0
        }
      })
    return map
  }, [entries])

  // Calendar grid cells
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()        // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result = []

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      result.push({ blank: true, key: `b-${i}` })
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      const dateStr = `${year}-${mm}-${dd}`
      const data = dailyMap[dateStr] || null
      result.push({ blank: false, day: d, dateStr, data, key: dateStr })
    }

    return result
  }, [year, month, dailyMap])

  const todayStr = useMemo(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  }, [])

  return (
    <div className="cal-grid-wrap">
      {/* Month navigation bar — integrated into the card */}
      <div className="cal-nav-bar">
        <button className="cal-nav-arrow" onClick={onPrevMonth}>
          <IconChevLeft />
        </button>

        <div className="cal-nav-selectors">
          <select
            className="cal-nav-select"
            value={year}
            onChange={e => onYearChange(Number(e.target.value))}
          >
            {(yearOptions || []).map(y => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </select>

          <select
            className="cal-nav-select"
            value={month}
            onChange={e => onMonthChange(Number(e.target.value))}
          >
            {(thaiMonths || []).map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>

        {!isCurrentMonth && (
          <button className="cal-today-btn" onClick={onToday}>
            ดูเดือนนี้
          </button>
        )}

        <button className="cal-nav-arrow" onClick={onNextMonth}>
          <IconChevRight />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="cal-header">
        {DAY_LABELS.map(d => (
          <div key={d} className="cal-header-cell">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="cal-body">
        {cells.map(c => {
          if (c.blank) {
            return <div key={c.key} className="cal-cell cal-cell-blank" />
          }

          const isSelected = selectedDate === c.dateStr
          const isToday = todayStr === c.dateStr
          const hasData = c.data !== null

          return (
            <div
              key={c.key}
              className={[
                'cal-cell',
                isSelected && 'cal-cell-selected',
                isToday && 'cal-cell-today',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(c.dateStr)}
            >
              <span className="cal-day-num">{c.day}</span>

              {hasData ? (
                <div className="cal-cell-amounts">
                  {c.data.income > 0 && (
                    <span className="cal-amount cal-income">+{formatBaht(c.data.income)}</span>
                  )}
                  {c.data.expense > 0 && (
                    <span className="cal-amount cal-expense">−{formatBaht(c.data.expense)}</span>
                  )}
                </div>
              ) : (
                <span className="cal-no-record">ไม่มีรายการ</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────────── */
function IconChevLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg> }
function IconChevRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg> }
