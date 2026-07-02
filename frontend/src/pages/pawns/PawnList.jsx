import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePawnCache } from '@/context/PawnCacheContext'
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
  const {
    activePawns,
    inactivePawns,
    forfeitedPawns,
    loading,
    error,
    reloadAll
  } = usePawnCache()

  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [showNew, setShowNew] = useState(false)

  // In-memory filter helper
  const filterPawns = (list, query) => {
    if (!query) return list
    const q = query.toLowerCase().trim()
    return list.filter(p => {
      const ticket = String(p.ticket_number || '')
      const name = (p.customer_name || '').toLowerCase()
      const item = (p.item_type || '').toLowerCase()
      return ticket.includes(q) || name.includes(q) || item.includes(q)
    })
  }

  // In-memory sort helper
  const sortPawns = (list, order) => {
    return [...list].sort((a, b) => {
      const numA = a.ticket_number || 0
      const numB = b.ticket_number || 0
      return order === 'asc' ? numA - numB : numB - numA
    })
  }

  const handleTabChange = (s) => {
    setStatus(s)
  }

  // Get count for each status
  const activeCount = activePawns.length
  const forfeitedCount = forfeitedPawns.length
  const inactiveCount = inactivePawns.length
  const totalCount = activeCount + forfeitedCount + inactiveCount

  // In-memory search results across all statuses
  const searchActive = sortPawns(filterPawns(activePawns, search), sortOrder)
  const searchInactive = sortPawns(filterPawns(inactivePawns, search), sortOrder)
  const searchForfeited = sortPawns(filterPawns(forfeitedPawns, search), sortOrder)

  const hasSearchResults = searchActive.length > 0 || searchInactive.length > 0 || searchForfeited.length > 0

  // Standard tab filtering
  let tabPawns = []
  if (status === 'active') {
    tabPawns = activePawns
  } else if (status === 'ขาด') {
    tabPawns = forfeitedPawns
  } else if (status === 'ถอน') {
    tabPawns = inactivePawns
  } else {
    tabPawns = [...activePawns, ...forfeitedPawns, ...inactivePawns]
  }

  const displayedPawns = sortPawns(tabPawns, sortOrder)
  const currentTotal = displayedPawns.reduce((s, p) => s + (p.current_principal || 0), 0)

  const renderTableRows = (list) => {
    return list.map(p => {
      const { label, cls } = pawnStatusBadge(p.status)
      return (
        <tr key={p.id} onClick={() => navigate(`/pawns/${p.id}`)} style={{ cursor: 'pointer' }}>
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
                  {p.ticket_status === 'lost' ? 'ตั๋วทำหาย' : 'ตั๋วชำรุด'}
                </span>
              )}
            </div>
          </td>
        </tr>
      )
    })
  }

  const renderSectionTable = (title, list) => {
    if (list.length === 0) return null
    return (
      <div className="pawn-search-section" style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          marginBottom: 10,
          padding: '0 4px',
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--text-primary)'
        }}>
          <span>{title}</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
            พบ {list.length} รายการ
          </span>
        </div>
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
                {renderTableRows(list)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">จำนำ</div>
          <div className="page-meta">
            {loading && displayedPawns.length === 0
              ? 'กำลังโหลดข้อมูล...'
              : search
                ? `ผลการค้นหา · รวมพบ ${(searchActive.length + searchInactive.length + searchForfeited.length)} รายการ`
                : `${displayedPawns.length} รายการ · ยอดรวม ${formatBaht(currentTotal)}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <FontAwesomeIcon icon={faPlus} />
          รับจำนำใหม่
        </button>
      </div>

      {/* Toolbar */}
      <div className="pl-toolbar">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, maxWidth: 380 }}>
          <div className="search-wrap">
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

        {search ? (
          <div style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: 14 }}>
            กำลังค้นหาคำว่า "{search}"...
          </div>
        ) : (
          <div className="pl-tabs">
            {STATUS_TABS.map(t => {
              let count = 0
              if (t.value === 'active') count = activeCount
              else if (t.value === 'ขาด') count = forfeitedCount
              else if (t.value === 'ถอน') count = inactiveCount
              else count = totalCount

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
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Main Content Area */}
      {loading && displayedPawns.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div className="empty-state-text">กำลังโหลดข้อมูล...</div>
        </div>
      ) : search ? (
        /* Search results layout showing 3 tables */
        <div>
          {hasSearchResults ? (
            <>
              {renderSectionTable('ยังอยู่ (Active)', searchActive)}
              {renderSectionTable('ขาด (Forfeited)', searchForfeited)}
              {renderSectionTable('ถอนแล้ว (Redeemed/Inactive)', searchInactive)}
            </>
          ) : (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
              <div style={{ color: 'var(--text-secondary)' }}>ไม่พบรายการที่ค้นหาสำหรับ "{search}"</div>
            </div>
          )}
        </div>
      ) : (
        /* Standard tabbed single table layout */
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
                {displayedPawns.length === 0 ? (
                  <tr className="loading-row">
                    <td colSpan={8}>ยังไม่มีรายการจำนำ</td>
                  </tr>
                ) : (
                  renderTableRows(displayedPawns)
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && (
        <NewPawnForm
          onSaved={() => { setShowNew(false); reloadAll() }}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}
