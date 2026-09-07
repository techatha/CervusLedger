import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ListIncomeExpense,
  GetIncomeExpenseSummary,
  DeleteIncomeExpense,
  CancelIncomeExpense,
  GetCancelPreview,
  ExportIncomeExpense,
  ListDailyCash,
} from 'wailsjs/go/income_expense_handler/IncomeExpenseHandler.js'
import { GetAllSettings } from 'wailsjs/go/settings_handler/SettingsHandler'
import { formatBaht } from '@/utils/thai'
import ManualEntryModal from './ManualEntryModal'
import EditIncomeExpenseModal from './EditIncomeExpenseModal'
import CalendarGrid from './components/incomePage/CalendarGrid'
import DailyView from './components/incomePage/DailyView'
import SummaryPanel from './components/incomePage/SummaryPanel'
import './IncomePage.css'
import './ManualEntryModal.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faArrowUpFromBracket, faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

// Generate year range for dropdown (±5 years from current)
const buildYearOptions = () => {
  const cur = new Date().getFullYear()
  const years = []
  for (let y = cur - 5; y <= cur + 1; y++) years.push(y)
  return years
}

const formatDateStr = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function IncomePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [startEditable, setStartEditable] = useState(false)

  const handleEdit = (entry, editable = false) => {
    setEditEntry(entry)
    setStartEditable(editable)
  }
  const [exporting, setExporting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [dailyCashList, setDailyCashList] = useState([])

  const [selectedDate, setSelectedDate] = useState(formatDateStr(now))
  const [typeFilter, setTypeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [presets, setPresets] = useState([])

  // Build date range for API from year/month
  const getDateRange = useCallback((y, m) => {
    const mm = String(m + 1).padStart(2, '0')
    const last = new Date(y, m + 1, 0).getDate()
    return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${last}` }
  }, [])

  const load = useCallback(async (y, m) => {
    setLoading(true)
    setError(null)
    try {
      const dr = getDateRange(y, m)
      // Fetch full month without type/source filters (calendar shows full picture)
      const filter = { type: '', source: '', start_date: dr.start, end_date: dr.end }
      const [data, sum, dcList] = await Promise.all([
        ListIncomeExpense(filter),
        GetIncomeExpenseSummary(dr.start, dr.end),
        ListDailyCash(dr.start, dr.end),
      ])
      console.log(data, sum, dcList)
      setEntries(data || [])
      setSummary(sum)
      setDailyCashList(dcList || [])
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => {
    load(year, month)
    GetAllSettings()
      .then(data => {
        try {
          if (data.income_expense_presets) {
            setPresets(JSON.parse(data.income_expense_presets))
          }
        } catch (e) {
          console.error("Failed to parse presets:", e)
        }
      })
      .catch(console.error)
  }, [])

  const reload = () => load(year, month)

  const mappedEntries = useMemo(() => {
    return entries.map(entry => {
      const preset = presets.find(p => p.name === entry.category && p.type === entry.type)
      return {
        ...entry,
        color: preset ? preset.color : '#cbd5e1'
      }
    })
  }, [entries, presets])

  // Month navigation
  const changeMonth = (y, m) => {
    setYear(y)
    setMonth(m)
    setSelectedDate(null)
    setTypeFilter('')
    setSourceFilter('')
    load(y, m)
  }

  const goToPrevMonth = () => {
    const newM = month === 0 ? 11 : month - 1
    const newY = month === 0 ? year - 1 : year
    changeMonth(newY, newM)
  }

  const goToNextMonth = () => {
    const newM = month === 11 ? 0 : month + 1
    const newY = month === 11 ? year + 1 : year
    changeMonth(newY, newM)
  }

  const goToToday = () => {
    const n = new Date()
    changeMonth(n.getFullYear(), n.getMonth())
  }

  // Day navigation — handles month boundary crossings
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    const d = new Date(newDate + 'T00:00:00')
    const newY = d.getFullYear()
    const newM = d.getMonth()
    if (newY !== year || newM !== month) {
      setYear(newY)
      setMonth(newM)
      load(newY, newM)
    }
  }

  const [cancelPreview, setCancelPreview] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirmDel) return
    try {
      await DeleteIncomeExpense(confirmDel.id)
      setConfirmDel(null)
      reload()
    } catch (e) {
      setError(String(e))
      setConfirmDel(null)
    }
  }

  const handleRequestCancel = async (entry) => {
    if (entry.source === 'auto' && entry.transaction_id) {
      // Auto entry with transaction_id: show cancel preview
      setCancelLoading(true)
      setCancelPreview(null)
      setConfirmDel(entry)
      try {
        const preview = await GetCancelPreview(entry.id)
        setCancelPreview(preview)
      } catch (e) {
        setError('ไม่สามารถดึงข้อมูลรายการได้: ' + e)
        setConfirmDel(null)
      } finally {
        setCancelLoading(false)
      }
    } else {
      // Manual entry or old auto entry: simple delete
      setConfirmDel(entry)
      setCancelPreview(null)
    }
  }

  const handleCancelTransaction = async () => {
    if (!confirmDel) return
    try {
      await CancelIncomeExpense(confirmDel.id)
      setConfirmDel(null)
      setCancelPreview(null)
      reload()
    } catch (e) {
      setError('ยกเลิกรายการไม่สำเร็จ: ' + e)
      setConfirmDel(null)
      setCancelPreview(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const dr = getDateRange(year, month)
      await ExportIncomeExpense(dr.start, dr.end)
    } catch (e) {
      setError('ส่งออกไม่สำเร็จ: ' + e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">บันทึกรายรับ-รายจ่าย</div>
          <div className="page-meta">
            {!loading && `${entries.length} รายการ — ${THAI_MONTHS[month]} ${year + 543}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={handleExport}
            disabled={exporting}
          >
            <FontAwesomeIcon icon={faArrowUpFromBracket} />
            {exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <FontAwesomeIcon icon={faPlus} />เพิ่มรายการ
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* 70/30 Layout */}
      <div className="ip-layout">
        {/* Left: Calendar or Daily view (70%) */}
        <div className="ip-calendar-area">
          {!selectedDate ? (
            <CalendarGrid
              year={year}
              month={month}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onYearChange={(y) => changeMonth(y, month)}
              onMonthChange={(m) => changeMonth(year, m)}
              yearOptions={buildYearOptions()}
              thaiMonths={THAI_MONTHS}
              onToday={goToToday}
              dailyCashList={dailyCashList}
            />
          ) : (
            <DailyView
              allEntries={mappedEntries}
              date={selectedDate}
              loading={loading}
              typeFilter={typeFilter}
              sourceFilter={sourceFilter}
              onTypeFilterChange={setTypeFilter}
              onSourceFilterChange={setSourceFilter}
              onDelete={handleRequestCancel}
              onDateChange={handleDateChange}
              onBack={() => setSelectedDate(null)}
              onAddEntry={() => setShowForm(true)}
              onEdit={handleEdit}
            />
          )}
        </div>


        {/* Right: Summary sidebar (30%) */}
        <div className="ip-sidebar">
          <SummaryPanel
            summary={summary}
            entries={mappedEntries}
            selectedDate={selectedDate}
            year={year}
            month={month}
          />
        </div>
      </div>

      {/* Manual entry modal */}
      {showForm && (
        <ManualEntryModal
          defaultDate={selectedDate}
          onSaved={() => { setShowForm(false); reload() }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit entry modal */}
      {editEntry && (
        <EditIncomeExpenseModal
          entry={editEntry}
          startEditable={startEditable}
          onSaved={() => { setEditEntry(null); reload() }}
          onClose={() => setEditEntry(null)}
          onRequestCancel={handleRequestCancel}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="modal-backdrop" onClick={() => { setConfirmDel(null); setCancelPreview(null) }}>
          <div className="modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {confirmDel.source === 'auto' && confirmDel.transaction_id
                  ? 'ยกเลิกรายการ'
                  : 'ยืนยันการลบ'}
              </div>
              <button className="modal-close" onClick={() => { setConfirmDel(null); setCancelPreview(null) }}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {confirmDel.source === 'auto' && confirmDel.transaction_id
                  ? <>ต้องการยกเลิกรายการ{' '}<strong style={{ color: 'var(--text-primary)' }}>{confirmDel.category}</strong>{' '}จำนวน{' '}<strong>{formatBaht(confirmDel.amount)}</strong> ?</>
                  : <>ต้องการลบรายการ{' '}<strong style={{ color: 'var(--text-primary)' }}>{confirmDel.category}</strong>{' '}จำนวน{' '}<strong>{formatBaht(confirmDel.amount)}</strong> ?</>}
              </p>

              {/* Cancel preview info for auto entries */}
              {confirmDel.source === 'auto' && confirmDel.transaction_id && cancelPreview && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cancelPreview.will_revert_payments && cancelPreview.will_revert_payments.length > 0 && (
                    <p style={{
                      padding: '8px 12px',
                      background: 'var(--red-bg, #fef2f2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      color: 'var(--red)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}>
                      <FontAwesomeIcon icon={faTriangleExclamation} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>จะยกเลิกการจ่ายดอกเบี้ย {cancelPreview.will_revert_payments.length} งวด ที่เชื่อมกับรายการนี้</span>
                    </p>
                  )}
                  {cancelPreview.will_revert_stock && (
                    <p style={{
                      padding: '8px 12px',
                      background: 'var(--red-bg, #fef2f2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      color: 'var(--red)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <FontAwesomeIcon icon={faTriangleExclamation} />
                      จะคืนยอดสต็อกทองที่เชื่อมกับรายการนี้
                    </p>
                  )}
                  {cancelPreview.will_revert_principal && (
                    <p style={{
                      padding: '8px 12px',
                      background: 'var(--red-bg, #fef2f2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      color: 'var(--red)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}>
                      <FontAwesomeIcon icon={faTriangleExclamation} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>
                        จะยกเลิกการเปลี่ยนเงินต้นจำนำที่เชื่อมกับรายการนี้
                        {cancelPreview.cascade_changes && cancelPreview.cascade_changes.length > 0 && (
                          <><br />รวมถึงรายการที่ใหม่กว่าอีก {cancelPreview.cascade_changes.length} รายการ</>
                        )}
                      </span>
                    </p>
                  )}
                  {cancelPreview.notice && (
                    <p style={{
                      padding: '8px 12px',
                      background: 'var(--bg-hover)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <FontAwesomeIcon icon={faCircleInfo} />
                      {cancelPreview.notice}
                    </p>
                  )}
                  {!cancelPreview.can_cancel && cancelPreview.reason && (
                    <p style={{
                      padding: '8px 12px',
                      background: 'var(--bg-hover)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <FontAwesomeIcon icon={faCircleInfo} />
                      {cancelPreview.reason}
                    </p>
                  )}
                </div>
              )}

              {/* Loading state for cancel preview */}
              {confirmDel.source === 'auto' && confirmDel.transaction_id && cancelLoading && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>กำลังตรวจสอบรายการที่เกี่ยวข้อง...</p>
              )}

              {/* Info notice for manual entries */}
              {(confirmDel.source !== 'auto' || !confirmDel.transaction_id) && (
                <p style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <FontAwesomeIcon icon={faCircleInfo} />
                  ลบรายการนี้จะไม่ส่งผลกับประวัติจำนำหรือสต็อก
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setConfirmDel(null); setCancelPreview(null) }}>ยกเลิก</button>
              {confirmDel.source === 'auto' && confirmDel.transaction_id ? (
                <button
                  className="btn"
                  style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                  onClick={handleCancelTransaction}
                  disabled={cancelLoading || (cancelPreview && !cancelPreview.can_cancel)}
                >
                  ยกเลิกรายการ
                </button>
              ) : (
                <button className="btn" style={{ background: 'var(--red)', color: '#fff', border: 'none' }} onClick={handleDelete}>ลบ</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────────── */
