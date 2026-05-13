import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  GetPawn,
  GetPawnPayments,
  GetPrincipalChanges,
  RedeemPawn,
  ForfeitPawn,
  UpdateTicketStatus,
} from '../../../wailsjs/go/main/App'
import { toBE, formatBaht, formatTicket, pawnStatusBadge } from '../../utils/thai'
import { RecordPaymentModal, PrincipalChangeModal } from './PawnModals'
import './PawnDetail.css'

export default function PawnDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const pawnId   = parseInt(id, 10)

  const [pawn,     setPawn]     = useState(null)
  const [payments, setPayments] = useState([])
  const [changes,  setChanges]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const [modal,    setModal]    = useState(null) // 'payment' | 'principal' | 'redeem' | 'forfeit'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, pays, chgs] = await Promise.all([
        GetPawn(pawnId),
        GetPawnPayments(pawnId),
        GetPrincipalChanges(pawnId),
      ])
      setPawn(p)
      setPayments(pays || [])
      setChanges(chgs || [])
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [pawnId])

  const handleRedeem = async () => {
    try {
      await RedeemPawn(pawnId)
      setModal(null)
      load()
    } catch (e) { setError(String(e)) }
  }

  const handleForfeit = async () => {
    try {
      await ForfeitPawn(pawnId)
      setModal(null)
      load()
    } catch (e) { setError(String(e)) }
  }

  const handleTicketStatus = async (ts) => {
    try {
      await UpdateTicketStatus(pawnId, ts)
      load()
    } catch (e) { setError(String(e)) }
  }

  if (loading) return <div className="page-view"><div className="empty-state"><div className="empty-state-text">กำลังโหลด...</div></div></div>
  if (error)   return <div className="page-view"><div className="alert alert-error">{error}</div></div>
  if (!pawn)   return null

  const { label: statusLabel, cls: statusCls } = pawnStatusBadge(pawn.status)
  const isActive  = pawn.status === 'active'
  const current   = pawn.current_principal ?? pawn.initial_principal
  const beYear    = d => { if (!d) return '—'; const p = new Date(d); return toBE(d) }

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div className="pd-title-row">
          <button className="btn btn-ghost btn-sm pd-back" onClick={() => navigate('/pawns')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            รายการจำนำ
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="page-title">
                ตั๋ว {formatTicket(pawn.ticket_number)}
              </div>
              <span className={`badge ${statusCls}`}>{statusLabel}</span>
              {pawn.ticket_status !== 'active' && (
                <span className="badge badge-amber">
                  {pawn.ticket_status === 'lost' ? 'ตั๋วทำหาย' : 'ตั๋วชำรุด'}
                </span>
              )}
            </div>
            <div className="page-meta">{pawn.customer_name_display || ''}</div>
          </div>
        </div>

        {/* Action buttons */}
        {isActive && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setModal('principal')}>
              เปลี่ยนต้นเงิน
            </button>
            <button className="btn btn-ghost" onClick={() => setModal('payment')}>
              <IconCash /> บันทึกจ่ายดอก
            </button>
            <button className="btn btn-ghost" onClick={() => setModal('redeem')}
              style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }}>
              ถอน
            </button>
            <button className="btn btn-ghost" onClick={() => setModal('forfeit')}
              style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
              ขาด
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="pd-layout">
        {/* ── Left: Pawn Info ── */}
        <div className="pd-left">
          <div className="card">
            <div className="card-header"><span className="card-title">ข้อมูลจำนำ</span></div>
            <div className="pd-info-rows">
              <PdRow label="วันที่จำนำ"   value={toBE(pawn.pawned_date)} />
              <PdRow label="ประเภทรายการ" value={pawn.item_type} />
              {pawn.weight_grams > 0 && (
                <PdRow label="น้ำหนัก" value={`${pawn.weight_grams} กรัม`} />
              )}
              {pawn.description && (
                <PdRow label="รายละเอียด" value={pawn.description} />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">การเงิน</span></div>
            <div className="pd-info-rows">
              <PdRow label="ต้นเงินเริ่มต้น" value={formatBaht(pawn.initial_principal)} />
              {current !== pawn.initial_principal && (
                <PdRow
                  label="ต้นเงินปัจจุบัน"
                  value={<strong style={{ color: 'var(--gold)' }}>{formatBaht(current)}</strong>}
                />
              )}
              <PdRow label="ดอกเบี้ย/เดือน" value={
                <span>
                  {formatBaht(pawn.interest_amount)}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                    ({pawn.monthly_interest_rate}%)
                  </span>
                </span>
              } />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">สถานะตั๋ว</span>
              {isActive && pawn.ticket_status === 'active' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleTicketStatus('lost')}>ทำหาย</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleTicketStatus('damaged')}>ชำรุด</button>
                </div>
              )}
              {isActive && pawn.ticket_status !== 'active' && (
                <button className="btn btn-ghost btn-xs" onClick={() => handleTicketStatus('active')}>คืนค่าปกติ</button>
              )}
            </div>
            <div className="pd-info-rows">
              <PdRow label="สถานะตั๋ว" value={
                pawn.ticket_status === 'active' ? 'ปกติ'
                : pawn.ticket_status === 'lost' ? '⚠ ทำหาย'
                : '⚠ ชำรุด'
              } />
            </div>
          </div>
        </div>

        {/* ── Right: History ── */}
        <div className="pd-right">
          {/* Payment history */}
          <div className="card pd-history-card">
            <div className="card-header">
              <span className="card-title">ประวัติการจ่ายดอกเบี้ย</span>
              <span className="pd-history-count">{payments.length} ครั้ง</span>
            </div>
            {payments.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-state-text">ยังไม่มีการจ่ายดอกเบี้ย</div>
              </div>
            ) : (
              <div className="pd-payment-grid">
                {payments.map(p => (
                  <div key={p.id} className="pd-payment-chip">
                    <div className="pd-payment-month">
                      {thaiMonthShort(p.month)} {p.year + 543}
                    </div>
                    <div className="pd-payment-date">{toBE(p.paid_date)}</div>
                    {p.notes && <div className="pd-payment-note">{p.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Principal change log */}
          {changes.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">บันทึกเปลี่ยนแปลงต้นเงิน</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>ประเภท</th>
                      <th style={{ textAlign: 'right' }}>จำนวน</th>
                      <th style={{ textAlign: 'right' }}>ต้นเงินใหม่</th>
                      <th>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map(c => (
                      <tr key={c.id} style={{ cursor: 'default' }}>
                        <td style={{ whiteSpace: 'nowrap' }}>{toBE(c.date)}</td>
                        <td>
                          <span className={`badge ${c.change_type === 'reduction' ? 'badge-green' : 'badge-amber'}`}>
                            {c.change_type === 'reduction' ? 'ลดต้น' : 'เพิ่มต้น'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {c.change_type === 'reduction' ? '−' : '+'}{formatBaht(c.amount)}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {formatBaht(c.new_principal)}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'payment' && (
        <RecordPaymentModal
          pawn={pawn}
          customerName={pawn.customer_name_display || ''}
          onSaved={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'principal' && (
        <PrincipalChangeModal
          pawn={{ ...pawn, current_principal: current }}
          onSaved={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'redeem' && (
        <ConfirmModal
          title="ยืนยันการถอน"
          body={`ตั๋ว ${formatTicket(pawn.ticket_number)} — ลูกค้ามารับทองคืนและชำระหนี้ครบแล้ว?`}
          confirmLabel="ถอน"
          confirmStyle={{ background: 'var(--blue)', color: '#fff', border: 'none' }}
          onConfirm={handleRedeem}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'forfeit' && (
        <ConfirmModal
          title="ยืนยันการขาด"
          body={`ตั๋ว ${formatTicket(pawn.ticket_number)} — ลูกค้าหมดสิทธิ์ไถ่ถอนแล้ว?`}
          confirmLabel="ขาด"
          confirmStyle={{ background: 'var(--red)', color: '#fff', border: 'none' }}
          onConfirm={handleForfeit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────────────── */
function PdRow({ label, value }) {
  return (
    <div className="pd-row">
      <span className="pd-row-label">{label}</span>
      <span className="pd-row-value">{value || '—'}</span>
    </div>
  )
}

function ConfirmModal({ title, body, confirmLabel, confirmStyle, onConfirm, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{body}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn" style={confirmStyle} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function IconCash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
}

const SHORT_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const thaiMonthShort = m => SHORT_MONTHS[m] || m

