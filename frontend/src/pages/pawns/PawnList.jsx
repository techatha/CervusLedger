import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListPawns } from 'wailsjs/go/handlers/PawnHandler'
import { toBE, formatBaht, formatTicket, pawnStatusBadge } from '@/utils/thai'
import { getPendingMonths } from '@/utils/pawn'
import NewPawnForm from './NewPawnForm'
import './PawnList.css'

const STATUS_TABS = [
  { value: 'active', label: 'ยังอยู่'  },
  { value: 'ถอน',    label: 'ถอนแล้ว' },
  { value: 'ขาด',    label: 'ขาด'     },
  { value: '',       label: 'ทั้งหมด'  },
]

export default function PawnList() {
  const navigate = useNavigate()
  const [pawns,    setPawns]    = useState([])
  const [status,   setStatus]   = useState('active')
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showNew,  setShowNew]  = useState(false)

  const load = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ListPawns('', q)
      setPawns(data || [])
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  const isMounted = useRef(false)

  // Debounce search & handle initial load
  useEffect(() => {
    if (!isMounted.current) {
      load(search)
      isMounted.current = true
      return
    }
    const t = setTimeout(() => load(search), 250)
    return () => clearTimeout(t)
  }, [search, load])

  const handleTabChange = (s) => {
    setStatus(s)
  }

  // Summary counts from loaded data (approximate — full count is server-side)
  const counts = pawns.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  const displayedPawns = status === '' ? pawns : pawns.filter(p => p.status === status)
  const currentTotal = displayedPawns.reduce((s, p) => s + (p.current_principal || 0), 0)

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">จำนำ</div>
          <div className="page-meta">
            {loading && displayedPawns.length > 0 ? 'กำลังโหลด...' : `${displayedPawns.length} รายการ · ยอดรวม ${formatBaht(currentTotal)}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <IconPlus />
          รับจำนำใหม่
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="pl-toolbar">
        <div className="pl-tabs">
          {STATUS_TABS.map(t => {
            const count = t.value === '' ? pawns.length : (counts[t.value] || 0)
            return (
              <button
                key={t.value}
                className={`pl-tab ${status === t.value ? 'pl-tab-active' : ''}`}
                onClick={() => handleTabChange(t.value)}
              >
                {t.label}
                <span className="pl-tab-count">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="search-wrap" style={{ maxWidth: 280 }}>
          <span className="search-icon"><IconSearch /></span>
          <input
            className="input search-input"
            placeholder="ตั๋ว, ชื่อ, รายการ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ตั๋ว</th>
                <th>ลูกค้า</th>
                <th>รายการ</th>
                <th>น้ำหนัก</th>
                <th>วันจำนำ</th>
                <th style={{ textAlign: 'right' }}>ต้นเงินปัจจุบัน</th>
                <th style={{ textAlign: 'right' }}>ดอกเบี้ย/เดือน</th>
                <th className="col-120">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedPawns.length === 0 ? (
                <tr className="loading-row"><td colSpan={8}>กำลังโหลด...</td></tr>
              ) : displayedPawns.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan={8}>
                    {search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการจำนำ'}
                  </td>
                </tr>
              ) : displayedPawns.map(p => {
                const { label, cls } = pawnStatusBadge(p.status)
                return (
                  <tr key={p.id} onClick={() => navigate(`/pawns/${p.id}`)}>
                    <td>
                      <span className="pl-ticket">{formatTicket(p.ticket_number)}</span>
                    </td>
                    <td className="pl-customer">{p.customer_name}</td>
                    <td>
                      <div className="pl-item">{p.item_type}</div>
                      {p.description && (
                        <div className="pl-desc">{p.description}</div>
                      )}
                    </td>
                    <td className="pl-weight">
                      {p.weight_grams ? `${p.weight_grams} ก.` : '—'}
                    </td>
                    <td className="pl-date">{toBE(p.pawned_date)}</td>
                    <td className="pl-amount pl-right">
                      {formatBaht(p.current_principal)}
                      {p.current_principal !== p.initial_principal && (
                        <div className="pl-initial">เริ่ม {formatBaht(p.initial_principal)}</div>
                      )}
                    </td>
                    <td className="pl-right">
                      <span className="pl-interest">{formatBaht(p.interest_amount)}</span>
                      <span className="pl-rate">{p.monthly_interest_rate}%</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <span className={`badge ${cls}`}>{label}</span>
                        {(() => {
                          const pending = getPendingMonths(p)
                          return pending.length > 0 ? (
                            <span className="badge badge-red" style={{ fontSize: 11, padding: '1px 6px' }}>
                              ค้าง {pending.length} เดือน
                            </span>
                          ) : null
                        })()}
                        {p.ticket_status !== 'active' && (
                        <span className="badge badge-amber">
                          {p.ticket_status === 'lost' ? 'ทำหาย' : 'ชำรุด'}
                        </span>
                      )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewPawnForm
          onSaved={() => { setShowNew(false); load(search) }}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}

function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IconSearch() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

