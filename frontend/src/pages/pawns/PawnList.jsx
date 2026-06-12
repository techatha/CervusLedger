import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListPawnsSorted } from 'wailsjs/go/handlers/PawnHandler'
import { toBE, formatBaht, formatTicket, pawnStatusBadge } from '@/utils/thai'
import { getPendingMonths } from '@/utils/pawn'
import NewPawnForm from './NewPawnForm'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faPlus, faArrowDownShortWide, faArrowDownWideShort } from '@fortawesome/free-solid-svg-icons'
import './PawnList.css'

const STATUS_TABS = [
  { value: 'active', label: 'ยังอยู่' },
  { value: 'ขาด', label: 'ขาด' },
  { value: 'ถอน', label: 'ถอนแล้ว' },
  { value: '', label: 'ทั้งหมด' },
]

export default function PawnList() {
  const navigate = useNavigate()
  const [pawns, setPawns] = useState([])
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async (q, order) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ListPawnsSorted('', q, order)
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
      load(search, sortOrder)
      isMounted.current = true
      return
    }
    const t = setTimeout(() => load(search, sortOrder), 250)
    return () => clearTimeout(t)
  }, [search, sortOrder, load])

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
          <FontAwesomeIcon icon={faPlus} />
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-wrap" style={{ maxWidth: 280 }}>
            <span className="search-icon">
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </span>
            <input
              className="input search-input"
              placeholder="ตั๋ว, ชื่อ, รายการ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className="pl-sort-btn"
            onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
            title="เรียงลำดับเลขตั๋ว"
          >
            <FontAwesomeIcon icon={sortOrder === 'asc' ? faArrowDownShortWide : faArrowDownWideShort} />
          </button>
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
          onSaved={() => { setShowNew(false); load(search, sortOrder) }}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}


