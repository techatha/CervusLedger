import { useMemo } from 'react'
import { toBE, formatBaht } from '@/utils/thai'
import './DailyView.css'

const TYPE_TABS = [
  { value: '',         label: 'ทั้งหมด' },
  { value: 'income',   label: 'รายรับ'  },
  { value: 'expense',  label: 'รายจ่าย' },
]

const SOURCE_TABS = [
  { value: '',        label: 'ทุกแหล่ง'   },
  { value: 'auto',    label: 'อัตโนมัติ' },
  { value: 'manual',  label: 'บันทึกเอง' },
]

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

/**
 * DailyView — full-card detail view for a selected day.
 * Replaces the calendar view when a day is clicked.
 *
 * @param {Array}    allEntries       - All entries for the month (unfiltered)
 * @param {string}   date             - Selected date (YYYY-MM-DD)
 * @param {boolean}  loading          - Loading state
 * @param {string}   typeFilter       - Current type filter value
 * @param {string}   sourceFilter     - Current source filter value
 * @param {Function} onTypeFilterChange   - Callback when type tab changes
 * @param {Function} onSourceFilterChange - Callback when source tab changes
 * @param {Function} onDelete        - Callback to request delete (receives entry)
 * @param {Function} onDateChange    - Callback(newDateStr) to navigate to another day
 * @param {Function} onBack          - Callback to return to calendar/month view
 */
export default function DailyView({
  allEntries,
  date,
  loading,
  typeFilter,
  sourceFilter,
  onTypeFilterChange,
  onSourceFilterChange,
  onDelete,
  onDateChange,
  onBack,
}) {
  // Filter entries for the selected day + current filters
  const entries = useMemo(() => {
    if (!date) return []
    return (allEntries || []).filter(e => {
      const matchDate   = e.date?.slice(0, 10) === date
      const matchType   = !typeFilter   || e.type === typeFilter
      const matchSource = !sourceFilter || e.source === sourceFilter
      return matchDate && matchType && matchSource
    })
  }, [allEntries, date, typeFilter, sourceFilter])

  // Net total for the filtered entries
  const netTotal = useMemo(() => {
    return entries.reduce((sum, e) => {
      return sum + (e.type === 'income' ? (e.amount || 0) : -(e.amount || 0))
    }, 0)
  }, [entries])

  // Day navigation
  const goToPrevDay = () => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    onDateChange(formatDateStr(d))
  }

  const goToNextDay = () => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    onDateChange(formatDateStr(d))
  }

  // Today check
  const todayStr = useMemo(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  }, [])
  const isToday = date === todayStr

  // Format date for the header
  const dateObj = new Date(date + 'T00:00:00')
  const formattedDate = `วัน${DAY_NAMES[dateObj.getDay()]}ที่ ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear() + 543}`

  return (
    <div className="dv-card">
      {/* Navigation header — styled like cal-nav-bar */}
      <div className="dv-nav-bar">
        <button className="dv-back-btn" onClick={onBack}>
          <IconChevLeft /> กลับไปปฏิทิน
        </button>

        <div className="dv-day-nav">
          <button className="dv-nav-arrow" onClick={goToPrevDay}>
            <IconChevLeft />
          </button>
          <span className="dv-nav-title">{formattedDate}</span>
          <button className="dv-nav-arrow" onClick={goToNextDay}>
            <IconChevRight />
          </button>
        </div>

        {!isToday && (
          <button className="dv-today-btn" onClick={() => onDateChange(todayStr)}>
            ดูวันนี้
          </button>
        )}

        <span className="dv-entry-count">{entries.length} รายการ</span>
      </div>

      {/* Filter tabs row — styled like cal-header */}
      <div className="dv-filter-bar">
        <div className="dv-tabs dv-tabs-type">
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              className={`dv-tab ${typeFilter === t.value ? 'dv-tab-active' : ''}`}
              onClick={() => onTypeFilterChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="dv-filter-sep" />
        <div className="dv-tabs dv-tabs-source">
          {SOURCE_TABS.map(t => (
            <button
              key={t.value}
              className={`dv-tab ${sourceFilter === t.value ? 'dv-tab-active' : ''}`}
              onClick={() => onSourceFilterChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ประเภท</th>
              <th>หมวดหมู่</th>
              <th style={{ textAlign:'right' }}>จำนวนเงิน</th>
              <th>แหล่งที่มา</th>
              <th>หมายเหตุ</th>
              <th style={{ width:60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row"><td colSpan={7}>กำลังโหลด...</td></tr>
            ) : entries.length === 0 ? (
              <tr className="loading-row"><td colSpan={7}>ไม่มีรายการในวันนี้</td></tr>
            ) : entries.map(e => (
              <tr key={e.id} style={{ cursor:'default' }}>
                <td className="ip-date">{toBE(e.date)}</td>
                <td>
                  <span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'}`}>
                    {e.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                  </span>
                </td>
                <td className="ip-category">{e.category}</td>
                <td className={`ip-amount ${e.type === 'income' ? 'ip-income' : 'ip-expense'}`}>
                  {e.type === 'income' ? '+' : '−'}{formatBaht(e.amount)}
                </td>
                <td>
                  <span className={`badge ${e.source === 'auto' ? 'badge-blue' : 'badge-muted'}`}>
                    {e.source === 'auto' ? 'อัตโนมัติ' : 'บันทึกเอง'}
                  </span>
                </td>
                <td className="ip-notes">{e.notes || '—'}</td>
                <td className="ip-del">
                  {e.source === 'manual' && (
                    <button
                      className="btn btn-danger-ghost btn-xs"
                      onClick={() => onDelete(e)}
                    >
                      ลบ
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Running total footer */}
      {entries.length > 0 && !loading && (
        <div className="ip-table-footer">
          <span>แสดง {entries.length} รายการ</span>
          <span className="ip-footer-net">
            สุทธิ:{' '}
            <span style={{ color: netTotal >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:700 }}>
              {formatBaht(netTotal)}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ─── Icons ───────────────────────────────────────────────────────── */
function IconChevLeft()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
function IconChevRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg> }
