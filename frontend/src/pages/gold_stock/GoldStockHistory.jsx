import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { amountDelta } from './component/HistoryMiniChart'
import './GoldStockHistory.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

function daysInMonth(year, month) {
    // month is 1-based
    return new Date(year, month, 0).getDate()
}

function padTwo(n) {
    return String(n).padStart(2, '0')
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * Props:
 *   typeName      {string}   — the gold type, e.g. "สร้อยคอ"
 *   items         {Array}    — catalog items whose type === typeName
 *   allStockLogs  {Array}    — all logs from the backend (unfiltered)
 *   onClose       {Function}
 */
export default function GoldStockHistory({ typeName, items, allStockLogs, onClose }) {
    const now = new Date()

    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1) // 1–12
    const [yearInput, setYearInput] = useState(String(now.getFullYear()))

    // Coerce year to a valid number; fall back to current year
    const year = parseInt(yearInput) || now.getFullYear()
    const month = selectedMonth // 1–12

    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

    const handleToday = () => {
        setSelectedMonth(now.getMonth() + 1)
        setYearInput(String(now.getFullYear()))
    }

    // Navigate prev / next month
    const goMonth = (delta) => {
        let m = selectedMonth + delta
        let y = parseInt(yearInput) || now.getFullYear()
        if (m < 1) { m = 12; y -= 1 }
        if (m > 12) { m = 1; y += 1 }
        setSelectedMonth(m)
        setYearInput(String(y))
    }

    // Build the set of days for this month
    const totalDays = daysInMonth(year, month)
    const days = Array.from({ length: totalDays }, (_, i) => i + 1)

    // Build a lookup: gold_item_id → { day → amount }
    // Only include logs that match year-month
    const monthPrefix = `${year}-${padTwo(month)}`

    const logMap = useMemo(() => {
        const map = {} // { [gold_item_id]: { [day]: amount } }
        allStockLogs.forEach(log => {
            if (!log.log_date.startsWith(monthPrefix)) return
            const day = parseInt(log.log_date.split('-')[2])
            if (!map[log.gold_item_id]) map[log.gold_item_id] = {}
            map[log.gold_item_id][day] = log.amount
        })
        return map
    }, [allStockLogs, monthPrefix])

    // Build a lookup of all history per item, sorted chronologically
    const itemHistoryMap = useMemo(() => {
        const map = {}
        allStockLogs.forEach(log => {
            if (!map[log.gold_item_id]) map[log.gold_item_id] = []
            map[log.gold_item_id].push(log)
        })
        Object.keys(map).forEach(id => {
            map[id].sort((a, b) => a.log_date.localeCompare(b.log_date))
        })
        return map
    }, [allStockLogs])

    // Sort items by subtype for consistent row order
    const sortedItems = [...items].sort((a, b) => a.subtype.localeCompare(b.subtype))

    // Weekday labels for day column headers
    const weekdayLabel = (day) => {
        const dateStr = `${year}-${padTwo(month)}-${padTwo(day)}`
        return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'short' })
    }

    return (
        <div className="gsh-backdrop" onClick={onClose}>
            <div className="gsh-panel" onClick={e => e.stopPropagation()}>

                {/* ── Header ────────────────────────────────────────────── */}
                <div className="gsh-header">
                    <div className="gsh-header-left">
                        <div className="gsh-title">{typeName}</div>
                        <div className="gsh-subtitle">ประวัติสต็อกรายวัน</div>
                    </div>

                    {/* Month / Year selector */}
                    <div className="gsh-month-selector">
                        <button
                            className="gsh-nav-btn"
                            onClick={() => goMonth(-1)}
                            title="เดือนก่อนหน้า"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>

                        <select
                            className="gsh-month-select"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(parseInt(e.target.value))}
                        >
                            {THAI_MONTHS.map((name, i) => (
                                <option key={i + 1} value={i + 1}>{name}</option>
                            ))}
                        </select>

                        <input
                            className="gsh-year-input"
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={yearInput}
                            onChange={e => setYearInput(e.target.value.replace(/\D/g, ''))}
                            onBlur={e => {
                                // Snap to valid year on blur
                                const v = parseInt(e.target.value)
                                if (!v || v < 2000 || v > 2100) setYearInput(String(now.getFullYear()))
                            }}
                        />
                        {!isCurrentMonth && (
                            <button className="gsh-today-btn" onClick={handleToday}>
                                ดูเดือนนี้
                            </button>
                        )}

                        <button
                            className="gsh-nav-btn"
                            onClick={() => goMonth(1)}
                            title="เดือนถัดไป"
                        >
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>

                    <button className="gsh-close-btn" onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {/* ── Table (horizontal: items=rows, days=columns) ────── */}
                <div className="gsh-body">
                    {sortedItems.length === 0 ? (
                        <div className="gsh-empty">ไม่มีรายการในประเภทนี้</div>
                    ) : (
                        <div className="gsh-table-wrap">
                            <table className="gsh-table">
                                <thead>
                                    <tr>
                                        <th className="gsh-th-item-label">รายการ</th>
                                        {days.map(day => {
                                            const isSunday = new Date(`${year}-${padTwo(month)}-${padTwo(day)}`).getDay() === 0
                                            return (
                                                <th key={day} className={`gsh-th-day ${isSunday ? 'gsh-th-sunday' : ''}`}>
                                                    <span className="gsh-day-num">{day}</span>
                                                    <span className="gsh-day-label">{weekdayLabel(day)}</span>
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedItems.map(item => {
                                        const hasAnyLog = days.some(d => logMap[item.id]?.[d] != null)

                                        return (
                                            <tr
                                                key={item.id}
                                                className={hasAnyLog ? 'gsh-row-has-log' : 'gsh-row-empty'}
                                            >
                                                <td className="gsh-td-item-label">
                                                    <div className="gsh-item-name">{typeName} {item.subtype}</div>
                                                    {(item.weight_grams > 0 || item.purity) && (
                                                        <div className="gsh-item-weight">
                                                            {item.weight_grams > 0 && `${item.weight_grams.toFixed(2)} ก.`}
                                                            {item.weight_grams > 0 && item.purity && ' · '}
                                                            {item.purity && `${item.purity}%`}
                                                        </div>
                                                    )}
                                                </td>
                                                {days.map(day => {
                                                    const amount = logMap[item.id]?.[day]
                                                    const hasLog = amount != null

                                                    let delta = 'neutral'
                                                    if (hasLog) {
                                                        const dateStr = `${year}-${padTwo(month)}-${padTwo(day)}`
                                                        const history = itemHistoryMap[item.id] || []
                                                        const currentIdx = history.findIndex(l => l.log_date.startsWith(dateStr))
                                                        if (currentIdx !== -1) {
                                                            const prevLog = currentIdx > 0 ? history[currentIdx - 1] : null
                                                            delta = amountDelta(amount, prevLog?.amount)
                                                        }
                                                    }

                                                    return (
                                                        <td
                                                            key={day}
                                                            className={`gsh-td-cell ${hasLog ? `gsh-td-filled gsh-td-filled-${delta}` : 'gsh-td-blank'}`}
                                                        >
                                                            {hasLog ? (
                                                                <span className="gsh-cell-value">
                                                                    {amount}
                                                                </span>
                                                            ) : (
                                                                <span className="gsh-cell-blank">—</span>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Footer ────────────────────────────────────────────── */}
                <div className="gsh-footer">
                    <span className="gsh-footer-note">
                        {typeName} {sortedItems.length} รายการ ·
                        แสดงข้อมูล {totalDays} วัน ·{' '}
                        {THAI_MONTHS[month - 1]} {year} ·{' '}
                    </span>
                </div>

            </div>
        </div>
    )
}