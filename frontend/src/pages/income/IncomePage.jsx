import { useState, useEffect, useCallback } from 'react'
import {
  ListIncomeExpense,
  GetIncomeExpenseSummary,
  DeleteIncomeExpense,
  ExportIncomeExpense,
} from 'wailsjs/go/handlers/SaleHandler.js'
import { toBE, formatBaht } from '@/utils/thai'
import ManualEntryModal from './ManualEntryModal'
import './IncomePage.css'

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

// Returns YYYY-MM-DD for first/last day of current month
const thisMonthRange = () => {
  const now  = new Date()
  const y    = now.getFullYear()
  const m    = String(now.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, now.getMonth() + 1, 0).getDate()
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${last}` }
}

export default function IncomePage() {
  const [entries,  setEntries]  = useState([])
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [exporting,setExporting]= useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const [typeFilter,   setTypeFilter]   = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [dateRange, setDateRange] = useState(thisMonthRange)

  const load = useCallback(async (tf, sf, dr) => {
    setLoading(true)
    setError(null)
    try {
      const filter = { type: tf, source: sf, start_date: dr.start, end_date: dr.end }
      const [data, sum] = await Promise.all([
        ListIncomeExpense(filter),
        GetIncomeExpenseSummary(dr.start, dr.end),
      ])
      setEntries(data || [])
      setSummary(sum)
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(typeFilter, sourceFilter, dateRange) }, [])

  const reload = () => load(typeFilter, sourceFilter, dateRange)

  const applyFilter = (tf, sf, dr) => {
    setTypeFilter(tf)
    setSourceFilter(sf)
    setDateRange(dr)
    load(tf, sf, dr)
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
      await ExportIncomeExpense(dateRange.start, dateRange.end)
    } catch (e) {
      setError('ส่งออกไม่สำเร็จ: ' + e)
    } finally {
      setExporting(false)
    }
  }

  const setQuickMonth = (offset) => {
    const now = new Date()
    now.setMonth(now.getMonth() + offset)
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const last = new Date(y, now.getMonth() + 1, 0).getDate()
    const dr = { start: `${y}-${m}-01`, end: `${y}-${m}-${last}` }
    applyFilter(typeFilter, sourceFilter, dr)
  }

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">รายรับ-รายจ่าย</div>
          <div className="page-meta">
            {!loading && `${entries.length} รายการ`}
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

      {/* Summary cards */}
      {summary && (
        <div className="ip-summary">
          <SummaryCard
            label="รายรับ"
            value={summary.total_income}
            color="green"
            icon={<IconIncome />}
          />
          <SummaryCard
            label="รายจ่าย"
            value={summary.total_expense}
            color="red"
            icon={<IconExpense />}
          />
          <SummaryCard
            label="คงเหลือสุทธิ"
            value={summary.net}
            color={summary.net >= 0 ? 'gold' : 'red'}
            icon={<IconNet />}
            large
          />
        </div>
      )}

      {/* Date range + quick buttons */}
      <div className="ip-date-row">
        <div className="ip-quick-btns">
          <button className="btn btn-ghost btn-sm" onClick={() => setQuickMonth(-1)}>เดือนที่แล้ว</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuickMonth(0)}>เดือนนี้</button>
        </div>
        <div className="ip-date-inputs">
          <input
            className="input ip-date-input"
            type="date"
            value={dateRange.start}
            onChange={e => applyFilter(typeFilter, sourceFilter, { ...dateRange, start: e.target.value })}
          />
          <span className="ip-date-sep">—</span>
          <input
            className="input ip-date-input"
            type="date"
            value={dateRange.end}
            onChange={e => applyFilter(typeFilter, sourceFilter, { ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      {/* Type + Source filter tabs */}
      <div className="ip-filter-row">
        <div className="pl-tabs">
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              className={`pl-tab ${typeFilter === t.value ? 'pl-tab-active' : ''}`}
              onClick={() => applyFilter(t.value, sourceFilter, dateRange)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pl-tabs">
          {SOURCE_TABS.map(t => (
            <button
              key={t.value}
              className={`pl-tab ${sourceFilter === t.value ? 'pl-tab-active' : ''}`}
              onClick={() => applyFilter(typeFilter, t.value, dateRange)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      <div className="card">
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
                <tr className="loading-row"><td colSpan={7}>ไม่มีรายการในช่วงวันที่นี้</td></tr>
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
                        onClick={() => setConfirmDel(e)}
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
              <span style={{ color: (summary?.net ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:700 }}>
                {formatBaht(summary?.net ?? 0)}
              </span>
            </span>
          </div>
        )}
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

/* ─── Summary Card ────────────────────────────────────────────────── */
function SummaryCard({ label, value, color, icon, large }) {
  const colors = {
    green: { bg:'var(--green-bg)',  border:'rgba(61,154,104,0.2)',  text:'var(--green)'  },
    red:   { bg:'var(--red-bg)',    border:'rgba(192,72,72,0.2)',   text:'var(--red)'    },
    gold:  { bg:'var(--bg-hover)', border:'var(--border)',          text:'var(--gold)'   },
  }
  const c = colors[color] || colors.gold
  return (
    <div className={`ip-stat ${large ? 'ip-stat-large' : ''}`}
      style={{ background:c.bg, border:`1px solid ${c.border}` }}>
      <div className="ip-stat-icon" style={{ color:c.text }}>{icon}</div>
      <div className="ip-stat-body">
        <div className="ip-stat-label">{label}</div>
        <div className="ip-stat-value" style={{ color:c.text }}>
          {formatBaht(value)}
        </div>
      </div>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────────── */
function IconPlus()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IconExcel()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> }
function IconIncome()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
function IconExpense() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> }
function IconNet()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
