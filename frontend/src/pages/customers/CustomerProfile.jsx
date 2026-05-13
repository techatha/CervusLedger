import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GetCustomer } from '../../../wailsjs/go/handlers/CustomerHandler'
import { GetCustomerPawnRecords } from '../../../wailsjs/go/handlers/PawnHandler'
import { fullName, toBE, pawnStatusBadge, formatBaht, formatTicket } from '../../utils/thai'
import CustomerForm from './CustomerForm'
import './CustomerProfile.css'

export default function CustomerProfile() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const custId    = parseInt(id, 10)

  const [customer, setCustomer] = useState(null)
  const [pawns,    setPawns]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [editing,  setEditing]  = useState(false)

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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            รายชื่อลูกค้า
          </button>
          <div>
            <div className="page-title">{fullName(customer)}</div>
            <div className="page-meta">รหัสลูกค้า #{customer.id}</div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          แก้ไขข้อมูล
        </button>
      </div>

      <div className="cp-layout">
        {/* ── Left: Customer Info ── */}
        <div className="cp-left">
          {/* Personal */}
          <div className="card cp-info-card">
            <div className="card-header">
              <span className="card-title">ข้อมูลส่วนตัว</span>
            </div>
            <div className="cp-fields">
              <InfoRow label="คำนำหน้า"     value={customer.prefix} />
              <InfoRow label="ชื่อจริง"      value={customer.firstname} />
              <InfoRow label="นามสกุล"       value={customer.lastname} />
              <InfoRow label="เบอร์โทร"      value={customer.phone} mono />
              <InfoRow
                label="เลขบัตรประชาชน"
                value={customer.id_card || null}
                render={v => (
                  <span className="cp-id-card">{v}</span>
                )}
              />
              <InfoRow label="วันที่เพิ่ม" value={toBE(customer.created_at)} />
            </div>
          </div>

          {/* Address */}
          <div className="card cp-info-card">
            <div className="card-header">
              <span className="card-title">ที่อยู่</span>
            </div>
            <div className="cp-fields">
              <InfoRow label="บ้านเลขที่"    value={customer.address_no} />
              <InfoRow label="หมู่"          value={customer.moo} />
              <InfoRow label="ที่อยู่เพิ่ม"  value={customer.address_line} />
              <InfoRow label="ถนน"           value={customer.road} />
              <InfoRow label="ตำบล/แขวง"    value={customer.tambon} />
              <InfoRow label="อำเภอ/เขต"    value={customer.amphoe} />
              <InfoRow label="จังหวัด"       value={customer.province} />
            </div>
          </div>

          {/* Stats */}
          <div className="cp-stat-grid">
            <StatCard
              label="จำนำที่ยังอยู่"
              value={activePawns.length}
              unit="รายการ"
              color="green"
            />
            <StatCard
              label="ยอดรวมปัจจุบัน"
              value={formatBaht(totalActive)}
              color="gold"
            />
            <StatCard
              label="รายการทั้งหมด"
              value={pawns.length}
              unit="รายการ"
              color="muted"
            />
          </div>
        </div>

        {/* ── Right: Pawn History ── */}
        <div className="cp-right">
          <div className="card">
            <div className="card-header">
              <span className="card-title">ประวัติจำนำ</span>
              {/* Future: add new pawn from here */}
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
                        <tr key={p.id} className="cp-pawn-row">
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
                            {p.description && (
                              <div className="cp-description">{p.description}</div>
                            )}
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
                              ({(p.monthly_interest_rate * 100).toFixed(1)}%)
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${cls}`}>{label}</span>
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
    green: { bg: 'var(--green-bg)',  text: 'var(--green)'  },
    gold:  { bg: 'var(--gold-dim)',  text: 'var(--gold-light)' },
    muted: { bg: 'var(--bg-card)',   text: 'var(--text-muted)' },
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

