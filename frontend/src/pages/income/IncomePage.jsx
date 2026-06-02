import { useState, useEffect, useCallback } from 'react'
import {
  ListIncomeExpense,
  GetIncomeExpenseSummary,
  DeleteIncomeExpense,
  ExportIncomeExpense,
} from 'wailsjs/go/handlers/IncomeExpenseHandler.js'
import { formatBaht } from '@/utils/thai'
import ManualEntryModal from './ManualEntryModal'
import CalendarGrid from './components/incomePage/CalendarGrid'
import DailyView from './components/incomePage/DailyView'
import SummaryPanel from './components/incomePage/SummaryPanel'
import './IncomePage.css'
import './ManualEntryModal.css'

const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

// Generate year range for dropdown (±5 years from current)
const buildYearOptions = () => {
  const cur = new Date().getFullYear()
  const years = []
  for (let y = cur - 5; y <= cur + 1; y++) years.push(y)
  return years
}

export default function IncomePage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const [entries,  setEntries]  = useState([])
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [exporting,setExporting]= useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const [selectedDate, setSelectedDate] = useState(null)
  const [typeFilter,   setTypeFilter]   = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  // Build date range for API from year/month
  const getDateRange = useCallback((y, m) => {
    const mm   = String(m + 1).padStart(2, '0')
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
      const [data, sum] = await Promise.all([
        ListIncomeExpense(filter),
        GetIncomeExpenseSummary(dr.start, dr.end),
      ])
      console.log(data, sum)
      setEntries(data || [])
      setSummary(sum)
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => { load(year, month) }, [])

  const reload = () => load(year, month)

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
          <div className="page-title">รายรับ-รายจ่าย</div>
          <div className="page-meta">
            {!loading && `${entries.length} รายการ — ${THAI_MONTHS[month]} ${year + 543}`}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button
            className="btn btn-ghost"
            onClick={handleExport}
            disabled={exporting}
          >
            <IconExcel />
            {exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <IconPlus /> เพิ่มรายการ
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
              entries={entries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onYearChange={(y) => changeMonth(y, month)}
              onMonthChange={(m) => changeMonth(year, m)}
              yearOptions={buildYearOptions()}
              thaiMonths={THAI_MONTHS}
              onToday={goToToday}
            />
          ) : (
            <DailyView
              allEntries={entries}
              date={selectedDate}
              loading={loading}
              typeFilter={typeFilter}
              sourceFilter={sourceFilter}
              onTypeFilterChange={setTypeFilter}
              onSourceFilterChange={setSourceFilter}
              onDelete={setConfirmDel}
              onDateChange={handleDateChange}
              onBack={() => setSelectedDate(null)}
            />
          )}
        </div>

        {/* Right: Summary sidebar (30%) */}
        <div className="ip-sidebar">
          <SummaryPanel summary={summary} />
        </div>
      </div>

      {/* Manual entry modal */}
      {showForm && (
        <ManualEntryModal
          onSaved={() => { setShowForm(false); reload() }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="modal-backdrop" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ width:400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">ยืนยันการลบ</div>
              <button className="modal-close" onClick={() => setConfirmDel(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color:'var(--text-secondary)', lineHeight:1.7 }}>
                ต้องการลบรายการ{' '}
                <strong style={{ color:'var(--text-primary)' }}>{confirmDel.category}</strong>
                {' '}จำนวน{' '}
                <strong>{formatBaht(confirmDel.amount)}</strong> ?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ยกเลิก</button>
              <button className="btn" style={{ background:'var(--red)', color:'#fff', border:'none' }} onClick={handleDelete}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────────── */
function IconPlus()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IconExcel()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> }
