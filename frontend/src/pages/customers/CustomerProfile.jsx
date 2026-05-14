import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GetCustomer } from '../../../wailsjs/go/handlers/CustomerHandler'
import { GetCustomerPawnRecords } from '../../../wailsjs/go/handlers/PawnHandler'
import { fullName, toBE, pawnStatusBadge, formatBaht, formatTicket } from '../../utils/thai'
import { getPendingMonths } from '../../utils/pawn'
import CustomerForm from './CustomerForm'
import './CustomerProfile.css'

export default function CustomerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const custId = parseInt(id, 10)

  const [customer, setCustomer] = useState(null)
  const [pawns, setPawns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      GetCustomer(custId),
      GetCustomerPawnRecords(custId),
    ])
      .then(([c, p]) => {
        setCustomer(c)
        setPawns(p || [])
      })
      .catch(e => setError('โหลดข้อมูลไม่สำเร็จ: ' + e))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [custId])

  // Pawn stats
  const activePawns = pawns.filter(p => p.status === 'active')
  const totalActive = activePawns.reduce((s, p) => s + (p.current_principal || p.initial_principal || 0), 0)
  const overdueCount = activePawns.filter(p => getPendingMonths(p).length > 0).length

  if (loading) return (
    <div className="page-view">
      <div className="empty-state">
        <div className="empty-state-text">กำลังโหลด...</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="page-view">
      <div className="alert alert-error">{error}</div>
    </div>
  )

  if (!customer) return null

  return (
    <div className="page-view">
      {/* Back + Header */}
      <div className="page-header">
        <div className="cp-title-row">
          <button className="btn btn-ghost btn-sm cp-back" onClick={() => navigate('/customers')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            รายชื่อลูกค้า
          </button>
          <div>
            <div className="page-title">{fullName(customer)}</div>
            <div className="page-meta">รหัสลูกค้า #{customer.id}</div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          แก้ไขข้อมูล
        </button>
      </div>

      {/* 1. Stats Row (Moved to Top) */}
      <div className="cp-stat-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatCard
          label="จำนำที่ยังอยู่"
          value={activePawns.length}
          unit="รายการ"
          color="green"
        />
        <StatCard
          label="ค้างจ่ายดอกเบี้ย"
          value={overdueCount}
          unit="รายการ"
          color="red"
        />
        <StatCard
          label="ยอดรวมปัจจุบัน"
          value={formatBaht(totalActive)}
          color="gold"
        />
        <StatCard
          label="รายการจำนำทั้งหมด"
          value={pawns.length}
          unit="รายการ"
          color="muted"
        />
      </div>

      <div className="cp-layout">
        {/* ── Top Section: Side-by-Side Info ── */}
        <div className="cp-info-container" style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
          {/* Personal Info */}
          <div className="card cp-info-card" style={{ flex: 1 }}>
            <div className="card-header">
              <span className="card-title">ข้อมูลส่วนตัว</span>
            </div>
            <div className="cp-fields">
              <InfoRow label="คำนำหน้า" value={customer.prefix} />
              <InfoRow label="ชื่อจริง" value={customer.firstname} />
              <InfoRow label="นามสกุล" value={customer.lastname} />
              <InfoRow label="เบอร์โทร" value={customer.phone} mono />
              <InfoRow
                label="เลขบัตรประชาชน"
                value={customer.id_card || null}
                render={v => <MaskedIdCard idCard={v} />}
              />
              <InfoRow label="วันที่เพิ่ม" value={toBE(customer.created_at)} />
            </div>
          </div>

          {/* Address Info */}
          <div className="card cp-info-card" style={{ flex: 1 }}>
            <div className="card-header">
              <span className="card-title">ที่อยู่</span>
            </div>
            <div className="cp-fields">
              {/* Combined House No. and Moo */}
              <InfoRow
                label="บ้านเลขที่"
                value={
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%' }}>

                    {/* Left Half (50%): House Number */}
                    <div>
                      {customer.address_no || <span className="cp-empty">—</span>}
                    </div>
                    
                    {/* Right Half (50%): Moo Label & Value */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span className="cp-info-label" style={{ minWidth: 'auto', padding: 0 }}>หมู่</span>
                      <span>{customer.moo || <span className="cp-empty">—</span>}</span>
                    </div>

                  </div>
                } 
              />
              <InfoRow label="ที่อยู่เพิ่ม" value={customer.address_line} />
              <InfoRow label="ถนน" value={customer.road} />
              <InfoRow label="ตำบล/แขวง" value={customer.tambon} />
              <InfoRow label="อำเภอ/เขต" value={customer.amphoe} />
              <InfoRow label="จังหวัด" value={customer.province} />
            </div>
          </div>
        </div>

        {/* ── Bottom Section: History Table ── */}
        <div className="cp-history-section">
          <div className="card">
            <div className="card-header">
              <span className="card-title">ประวัติจำนำ</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ตั๋ว</th>
                    <th>วันจำนำ</th>
                    <th>รายการ</th>
                    <th>น้ำหนัก</th>
                    <th>ต้นเงิน</th>
                    <th>ดอกเบี้ย/เดือน</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {pawns.length === 0 ? (
                    <tr className="loading-row">
                      <td colSpan={7}>ยังไม่มีประวัติการจำนำ</td>
                    </tr>
                  ) : (
                    pawns.map(p => {
                      const { label, cls } = pawnStatusBadge(p.status)
                      const principal = p.current_principal ?? p.initial_principal
                      return (
                        <tr key={p.id} className="cp-pawn-row" onClick={() => navigate(`/pawns/${p.id}`)}>
                          <td>
                            <span className="cp-ticket">{formatTicket(p.ticket_number)}</span>
                            {p.ticket_status !== 'active' && (
                              <span className="badge badge-amber" style={{ marginLeft: 4, fontSize: 10 }}>
                                {p.ticket_status === 'lost' ? 'ทำหาย' : 'ชำรุด'}
                              </span>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{toBE(p.pawned_date)}</td>
                          <td>
                            <div className="cp-item-type">{p.item_type}</div>
                            {p.description && <div className="cp-description">{p.description}</div>}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {p.weight_grams ? `${p.weight_grams} ก.` : '—'}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {formatBaht(principal)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {formatBaht(p.interest_amount)}
                            <span className="cp-rate">
                              ({p.monthly_interest_rate}%)
                            </span>
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
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <CustomerForm
          customerId={custId}
          onSaved={() => { setEditing(false); load() }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────────────── */
function InfoRow({ label, value, mono, render }) {
  const display = value || null
  return (
    <div className="cp-info-row">
      <span className="cp-info-label">{label}</span>
      <span className={`cp-info-value ${mono ? 'cp-mono' : ''}`}>
        {display
          ? (render ? render(display) : display)
          : <span className="cp-empty">—</span>}
      </span>
    </div>
  )
}

function StatCard({ label, value, unit, color }) {
  const colorMap = {
    green: { bg: 'var(--green-bg)', text: 'var(--green)' },
    red: { bg: 'var(--red-bg)', text: 'var(--red)' },
    gold: { bg: 'var(--bg--card)', text: 'var(--gold-light)' },
    muted: { bg: 'var(--bg-card)', text: 'var(--text-muted)' },
  }
  const c = colorMap[color] || colorMap.muted
  return (
    <div className="cp-stat" style={{ background: c.bg }}>
      <div className="cp-stat-value" style={{ color: c.text }}>
        {value}
        {unit && <span className="cp-stat-unit">{unit}</span>}
      </div>
      <div className="cp-stat-label">{label}</div>
    </div>
  )
}

function MaskedIdCard({ idCard }) {
  const [revealed, setRevealed] = useState(false)
  
  // Create the masked version (e.g., "1xxxxxxxxxxx9")
  const masked = idCard.length > 2 
    ? `${idCard.slice(0, 1)}${'x'.repeat(idCard.length - 2)}${idCard.slice(-1)}`
    : 'xxx'

  return (
    <span 
      className={`cp-id-card ${!revealed ? 'cp-id-masked' : ''}`}
      onClick={() => setRevealed(!revealed)}
      title={revealed ? "คลิกเพื่อซ่อน" : "คลิกเพื่อดู"}
    >
      {revealed ? idCard : masked}
    </span>
  )
}

