import { useState, useEffect, useMemo } from 'react'
import { toBE, formatBaht } from '@/utils/thai'
import { GetDailyCash, SaveDailyCash } from 'wailsjs/go/handlers/IncomeExpenseHandler.js'
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
  const [dailyCash, setDailyCash] = useState(null)
  const [actualVal, setActualVal] = useState('')
  const [notesVal, setNotesVal] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isReconciling, setIsReconciling] = useState(false)

  const loadDailyCash = async (d) => {
    try {
      setSaveSuccess(false)
      const res = await GetDailyCash(d)
      setDailyCash(res)
      setActualVal(String(res.actual_amount))
      setNotesVal(res.notes || '')
      // Auto-expand if already saved (user likely wants to review/edit)
      setIsReconciling(res.is_saved)
    } catch (e) {
      console.error("Failed to load daily cash:", e)
    }
  }

  useEffect(() => {
    if (date) {
      loadDailyCash(date)
    }
  }, [date])

  const handleSaveDailyCash = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const parsedActual = parseFloat(actualVal)
      const res = await SaveDailyCash({
        date: date,
        actual_amount: isNaN(parsedActual) ? 0.0 : parsedActual,
        notes: notesVal
      })
      setDailyCash(res)
      setActualVal(String(res.actual_amount))
      setNotesVal(res.notes || '')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      alert("ไม่สามารถบันทึกยอดเงินได้: " + e)
    } finally {
      setIsSaving(false)
    }
  }

  const todayNet = useMemo(() => {
    if (!date) return 0
    return (allEntries || []).filter(e => e.date?.slice(0, 10) === date)
      .reduce((sum, e) => sum + (e.type === 'income' ? (e.amount || 0) : -(e.amount || 0)), 0)
  }, [allEntries, date])

  const discrepancy = useMemo(() => {
    if (!dailyCash) return 0
    const act = parseFloat(actualVal)
    if (isNaN(act)) return -dailyCash.expected_amount
    return act - dailyCash.expected_amount
  }, [dailyCash, actualVal])

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

      {/* ─── Daily Cash Reconciliation Card ─── */}
      {dailyCash && (
        <div className="dv-cash-reconciliation">
          <div className="dv-cash-card">
            {/* Header row */}
            <div className="dv-cash-header">
              <span className="dv-cash-title">
                <IconCash /> ยอดเงินสดในร้านวันนี้
              </span>
              <span className={`badge ${dailyCash.is_saved ? 'badge-green' : 'badge-muted'}`}>
                {dailyCash.is_saved ? 'สรุปยอดแล้ว' : 'ฉบับร่าง'}
              </span>
            </div>

            {/* Summary metrics — always visible */}
            <div className="dv-cash-summary-row">
              <div className="dv-cash-metric">
                <div className="dv-cash-label">ยอดยกมา (เมื่อวาน)</div>
                <div className="dv-cash-val-display">{formatBaht(dailyCash.amount_yesterday)}</div>
              </div>
              <div className="dv-cash-metric">
                <div className="dv-cash-label">เข้า/ออกวันนี้ (สุทธิ)</div>
                <div className={`dv-cash-val-display ${todayNet >= 0 ? 'ip-income' : 'ip-expense'}`}>
                  {todayNet >= 0 ? '+' : ''}{formatBaht(todayNet)}
                </div>
              </div>
              <div className="dv-cash-metric highlight">
                <div className="dv-cash-label font-bold">ยอดที่ควรมีในร้าน</div>
                <div className="dv-cash-val-display expected font-bold">{formatBaht(dailyCash.expected_amount)}</div>
              </div>

              {/* Reconcile toggle button — visible when panel is collapsed */}
              {!isReconciling && (
                <button
                  className="btn btn-primary dv-cash-reconcile-btn"
                  onClick={() => setIsReconciling(true)}
                >
                  <IconClipboard /> ตรวจนับยอด
                </button>
              )}
            </div>

            {/* ─── Expandable reconciliation panel ─── */}
            {isReconciling && (
              <div className="dv-cash-edit-panel">
                <div className="dv-cash-edit-row">
                  <div className="dv-cash-edit-field">
                    <label className="dv-cash-edit-label">
                      <IconEdit /> ยอดที่มีอยู่จริง (นับจริง)
                    </label>
                    <div className="dv-cash-input-wrap">
                      <span className="dv-cash-input-prefix">฿</span>
                      <input
                        type="number"
                        step="any"
                        className="dv-cash-input"
                        placeholder="0.00"
                        value={actualVal}
                        onChange={(e) => setActualVal(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="dv-cash-edit-field">
                    <label className="dv-cash-edit-label">ผลต่าง (ขาด/เกิน)</label>
                    <div className={`dv-cash-discrepancy-display ${discrepancy >= 0 ? 'ip-income' : 'ip-expense'}`}>
                      {discrepancy > 0 ? '+' : ''}{formatBaht(discrepancy)}
                      <span className="discrepancy-tag">
                        {discrepancy === 0 ? 'พอดี' : discrepancy > 0 ? 'เงินเกิน' : 'เงินขาด'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="dv-cash-edit-actions">
                  <div className="dv-cash-notes-wrap">
                    <input
                      type="text"
                      className="dv-cash-notes-input"
                      placeholder="ระบุหมายเหตุการตรวจนับยอดเงินวันนี้..."
                      value={notesVal}
                      onChange={(e) => setNotesVal(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-ghost dv-cash-cancel-btn"
                    onClick={() => setIsReconciling(false)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className={`btn ${dailyCash.is_saved ? 'btn-ghost' : 'btn-primary'} dv-cash-save-btn`}
                    onClick={handleSaveDailyCash}
                    disabled={isSaving}
                  >
                    {isSaving ? 'กำลังบันทึก...' : dailyCash.is_saved ? 'อัปเดตยอด' : 'สรุปยอดวันนี้'}
                  </button>
                </div>

                {saveSuccess && (
                  <div className="dv-cash-success-banner">✓ บันทึกยอดเงินสดประจำวันสำเร็จ</div>
                )}
              </div>
            )}
          </div>
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
function IconCash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign:'middle', marginRight: 4 }}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
function IconClipboard() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign:'middle', marginRight: 3 }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
