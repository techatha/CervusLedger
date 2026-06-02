import { useMemo } from 'react'
import { formatBaht } from '@/utils/thai'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleLeft, faAngleRight, } from '@fortawesome/free-solid-svg-icons'
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
  year, month, selectedDate, onSelectDate,
  onPrevMonth, onNextMonth, onYearChange, onMonthChange,
  yearOptions, thaiMonths, onToday,
  dailyCashList = [],
}) {
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  
  // Build a map: "YYYY-MM-DD" → DailyCash object
  const dailyCashMap = useMemo(() => {
    const map = {}
    ;(dailyCashList || []).forEach(dc => {
      map[dc.date?.slice(0, 10)] = dc
    })
    return map
  }, [dailyCashList])

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
      const dc = dailyCashMap[dateStr] || null
      result.push({ blank: false, day: d, dateStr, dc, key: dateStr })
    }

    return result
  }, [year, month, dailyCashMap])

  const todayStr = useMemo(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  }, [])

  return (
    <div className="cal-grid-wrap">
      {/* Month navigation bar — integrated into the card */}
      <div className="cal-nav-bar">
        <button className="cal-nav-arrow" onClick={onPrevMonth}>
        <FontAwesomeIcon icon={faAngleLeft} />
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
        <FontAwesomeIcon icon={faAngleRight} />
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
          const dc = c.dc
          const hasRecord = dc && dc.is_saved

          const diff = hasRecord ? (dc.actual_amount - dc.expected_amount) : 0

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

              {hasRecord ? (
                <div className="cal-cell-amounts">
    
                  <span className='cal-ac'>ยอดเงินคงเหลือ</span>
                  <span className="cal-actual">
                    {formatBaht(dc.actual_amount)}
                  </span>
                  {diff !== 0 && (
                    <span className={`cal-amount ${diff > 0 ? 'cal-income' : 'cal-expense'}`}>
                      {diff > 0 ? 'เกิน +' : 'ขาด '}{formatBaht(diff)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="cal-no-record">ยังไม่ได้สรุปยอด</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
