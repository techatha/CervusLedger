import { useState, useEffect, useMemo, Fragment } from 'react'
import { toBE, formatBaht } from '@/utils/thai'
import { GetDailyCash, SaveDailyCash } from 'wailsjs/go/handlers/IncomeExpenseHandler.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleLeft, faAngleRight, faPenToSquare, faCircleCheck, faCircleXmark, faPlus } from '@fortawesome/free-solid-svg-icons'
import { faCalendarDays, faClipboard, faTrashCan } from '@fortawesome/free-regular-svg-icons'
import './DailyView.css'

const TYPE_TABS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'income', label: 'รายรับ' },
  { value: 'expense', label: 'รายจ่าย' },
]

const SOURCE_TABS = [
  { value: '', label: 'ทุกแหล่ง' },
  { value: 'auto', label: 'อัตโนมัติ' },
  { value: 'manual', label: 'บันทึกเอง' },
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
 * @param {Function} onAddEntry      - Callback when user clicks 'เพิ่มรายการ'
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
  onAddEntry,
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
      setIsReconciling(false)
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
      setIsReconciling(false)
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
      const matchDate = e.date?.slice(0, 10) === date
      const matchType = !typeFilter || e.type === typeFilter
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
          <FontAwesomeIcon icon={faCalendarDays} /> กลับไปที่ปฏิทิน
        </button>

        <div className="dv-day-nav">
          <button className="dv-nav-arrow" onClick={goToPrevDay}>
            <FontAwesomeIcon icon={faAngleLeft} />
          </button>
          <span className="dv-nav-title">{formattedDate}</span>
          <button className="dv-nav-arrow" onClick={goToNextDay}>
            <FontAwesomeIcon icon={faAngleRight} />
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

        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={onAddEntry}
        >
          <FontAwesomeIcon icon={faPlus} /> เพิ่มรายการ
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ประเภท</th>
              <th>หมวดหมู่</th>
              <th style={{ textAlign: 'right' }}>จำนวนเงิน</th>
              <th>แหล่งที่มา</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row"><td colSpan={5}>กำลังโหลด...</td></tr>
            ) : entries.length === 0 ? (
              <tr className="loading-row"><td colSpan={5}>ไม่มีรายการในวันนี้</td></tr>
            ) : null}
          </tbody>

          {entries.length > 0 && !loading && entries.map(e => (
            <tbody key={e.id} className="dv-table-row-group">
              <tr className={e.notes ? 'dv-row-has-notes' : ''} style={{ cursor: 'default' }}>
                <td>
                  <span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'}`}>
                    {e.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                  </span>
                </td>
                <td className="ip-category">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: e.color || '#cbd5e1',
                          flexShrink: 0
                        }}
                      />
                      <span>{e.category}</span>
                    </div>
                    {e.date && e.date.length > 10 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '16px', marginTop: '2px' }}>
                        เวลา {e.date.slice(11, 16)} น.
                      </span>
                    )}
                  </div>
                </td>
                <td className={`ip-amount ${e.type === 'income' ? 'ip-income' : 'ip-expense'}`}>
                  {e.type === 'income' ? '+' : '−'}{formatBaht(e.amount)}
                </td>
                 <td>
                  <span className={`badge ${e.source === 'auto' ? 'badge-blue' : 'badge-amber'}`}>
                    {e.source === 'auto' ? 'อัตโนมัติ' : 'บันทึกเอง'}
                  </span>
                </td>
                <td className="ip-del">
                  <button
                    className="btn btn-danger-ghost btn-xs"
                    onClick={() => onDelete(e)}
                    title="ลบ"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </td>
              </tr>
              {e.notes && (
                <tr className="dv-notes-row">
                  <td></td>
                  <td colSpan={4} className="dv-notes-cell">
                    <span className="dv-notes-label">หมายเหตุ:</span>
                    <span className="dv-notes-text">{e.notes}</span>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </div>

      {/* Running total footer */}
      {entries.length > 0 && !loading && (
        <div
          className="ip-table-footer"
          style={{
            backgroundColor: 'var(--bg-hover)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span>แสดง {entries.length} รายการ</span>
          <span className="ip-footer-net">
            สุทธิ:{' '}
            <span style={{ color: netTotal >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              {formatBaht(netTotal)}
            </span>
          </span>
        </div>
      )}

      {/* ─── Daily Cash Reconciliation ─── */}
      {dailyCash && (
        <div className="dv-cash-section">
          <div className="dv-cash-section-divider" />

          {/* Always-visible summary row */}
          <div className="dv-cash-summary-row">
            <div className="dv-cash-metric">
              <div className="dv-cash-label">
                {dailyCash.last_record_date 
                  ? `ยอดยกมา (จากวันที่ ${toBE(dailyCash.last_record_date)})` 
                  : 'ยอดยกมา (ไม่มีบันทึกก่อนหน้า)'}
              </div>
              <div className="dv-cash-val">{formatBaht(dailyCash.amount_last_record)}</div>
            </div>
            <div className="dv-cash-sep" />
            <div className="dv-cash-metric">
              <div className="dv-cash-label">เข้า/ออกวันนี้ (สุทธิ)</div>
              <div className={`dv-cash-val ${todayNet >= 0 ? 'ip-income' : 'ip-expense'}`}>
                {todayNet >= 0 ? '+' : ''}{formatBaht(todayNet)}
              </div>
            </div>
            <div className="dv-cash-sep" />
            <div className="dv-cash-metric">
              <div className="dv-cash-label">ยอดที่ควรมีในร้าน</div>
              <div className="dv-cash-val dv-cash-expected">{formatBaht(dailyCash.expected_amount)}</div>
            </div>
          </div>

          {/* Centered actions section below metrics */}
          <div className="dv-cash-actions-centered">
            {dailyCash.is_saved && !isReconciling ? (
              <>
                <span className="badge badge-green">
                  <FontAwesomeIcon icon={faCircleCheck} /> สรุปยอดแล้ว
                </span>

                <div className="dv-cash-status-line">
                  <span className="dv-cash-status-time">
                    บันทึกแล้วเมื่อ: {formatDateTimeThai(dailyCash.created_at)}
                  </span>
                  <button
                    className="btn btn-ghost btn-xs dv-cash-edit-icon-btn"
                    onClick={() => setIsReconciling(true)}
                    title="แก้ไขยอด"
                    style={{ justifySelf: 'end' }}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} /> แก้ไข
                  </button>
                </div>

                  <div className="dv-cash-result-row">
                    <div className="dv-cash-result-metric">
                      <span className="dv-cash-result-label">ยอดนับจริง</span>
                      <span className="dv-cash-result-val">
                        {formatBaht(parseFloat(actualVal) || 0)}
                      </span>
                    </div>
                    <div className="dv-cash-result-sep" />
                    <div className="dv-cash-result-metric">
                      <span className="dv-cash-result-label">ผลต่าง</span>
                      {discrepancy === 0 ? (
                        <span className="dv-cash-result-val is-zero">ตรงตามยอดที่คาดไว้</span>
                      ) : (
                        <span className={`dv-cash-result-val ${discrepancy > 0 ? 'ip-income' : 'ip-expense'}`}>
                          {discrepancy > 0 ? '+' : ''}{formatBaht(discrepancy)}
                          <span className={`discrepancy-tag-lg ${discrepancy > 0 ? 'tag-green' : 'tag-red'}`}>
                            {discrepancy > 0 ? 'เกิน' : 'ขาด'}
                          </span>
            
                        </span>
                      )}
                    </div>
                  </div>

                {dailyCash.notes && (
                  <p className="dv-cash-notes-display">หมายเหตุ: {dailyCash.notes}</p>
                )}
              </>
            ) : !isReconciling ? (
              <>
                <span className="badge badge-red">
                  <FontAwesomeIcon icon={faCircleXmark} />  ยังไม่ได้สรุปยอด
                </span>

                <button
                  className="btn btn-primary dv-btn-large"
                  onClick={() => setIsReconciling(true)}
                >
                  <FontAwesomeIcon icon={faClipboard} /> ตรวจนับยอด
                </button>
              </>

            ) : null}
          </div>

          {/* Expandable edit panel */}
          {isReconciling && (
            <div className="dv-cash-edit-panel">
              <div className="dv-cash-edit-row">
                <div className="dv-cash-edit-field">
                  <label className="dv-cash-edit-label">
                    <FontAwesomeIcon icon={faPenToSquare} /> ยอดที่มีอยู่จริง (นับจริง)
                  </label>
                  <div className="dv-cash-input-wrap">
                    <span className="dv-cash-input-prefix">฿</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="dv-cash-input"
                      placeholder="0.00"
                      value={actualVal}
                      onChange={e => setActualVal(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="dv-cash-edit-field">
                  <label className="dv-cash-edit-label">ผลต่าง (ขาด/เกิน)</label>
                  <div className={`dv-cash-discrepancy-display ${discrepancy >= 0 ? 'ip-income' : 'ip-expense'}`}>
                    <span className="discrepancy-tag">
                      {discrepancy === 0 ? 'พอดี' : discrepancy > 0 ? 'เงินเกิน' : 'เงินขาด'}
                    </span>
                    {discrepancy > 0 ? '+' : ''}{formatBaht(discrepancy)}
                  </div>
                </div>
              </div>

              <div className="dv-cash-edit-actions">
                <input
                  type="text"
                  className="dv-cash-notes-input"
                  placeholder="ระบุหมายเหตุ..."
                  value={notesVal}
                  onChange={e => setNotesVal(e.target.value)}
                />
                <button
                  className="btn btn-ghost dv-btn-large"
                  onClick={() => setIsReconciling(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn btn-primary dv-btn-large"
                  onClick={handleSaveDailyCash}
                  disabled={isSaving}
                >
                  {isSaving ? 'กำลังบันทึก...' : dailyCash.is_saved ? 'อัปเดตยอด' : 'สรุปยอดวันนี้'}
                </button>
              </div>

              {saveSuccess && (
                <div className="alert alert-success dv-cash-success">
                  ✓ บันทึกยอดเงินสดประจำวันสำเร็จ
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTimeThai(dtStr) {
  if (!dtStr) return '—'
  // SQLite format can be YYYY-MM-DD HH:MM:SS, let's parse it safely
  const formatted = dtStr.replace(' ', 'T')
  const d = new Date(formatted)
  if (isNaN(d)) return dtStr
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear() + 543
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${year} เวลา ${hours}:${minutes} น.`
}

