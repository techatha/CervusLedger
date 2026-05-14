import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  GetPawn,
  GetPawnPayments,
  GetPrincipalChanges,
  RedeemPawn,
  ForfeitPawn,
  UpdateTicketStatus,
} from '../../../wailsjs/go/handlers/PawnHandler'
import { toBE, formatBaht, formatTicket, pawnStatusBadge } from '../../utils/thai'
import { getPendingMonths, thaiMonthShort } from '../../utils/pawn'
import { RecordPaymentModal, PrincipalChangeModal } from './PawnModals'
import './PawnDetail.css'

export default function PawnDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pawnId = parseInt(id, 10)

  const [pawn, setPawn] = useState(null)
  const [payments, setPayments] = useState([])
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modal, setModal] = useState(null) // 'payment' | 'principal' | 'redeem' | 'forfeit'

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
  if (error) return <div className="page-view"><div className="alert alert-error">{error}</div></div>
  if (!pawn) return null

  const { label: statusLabel, cls: statusCls } = pawnStatusBadge(pawn.status)
  const isActive = pawn.status === 'active'
  const current = pawn.current_principal ?? pawn.initial_principal

  const pendingMonths = getPendingMonths(pawn, payments)

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div className="pd-title-row">
          <button className="btn btn-ghost btn-sm pd-back" onClick={() => navigate('/pawns')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            รายการจำนำ
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="page-title">
                # {formatTicket(pawn.ticket_number)} {pawn.customer_name}
              </div>
              <span className={`badge ${statusCls}`}>{statusLabel}</span>
              {pawn.ticket_status !== 'active' && (
                <span className="badge badge-amber">
                  {pawn.ticket_status === 'lost' ? 'ตั๋วทำหาย' : 'ตั๋วชำรุด'}
                </span>
              )}
              {pendingMonths.length > 1 && (
                <span className="badge badge-red">ค้างจ่าย {pendingMonths.length} เดือน</span>
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
              <PdRow label="วันที่จำนำ" value={toBE(pawn.pawned_date)} />
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

          {/* 1. Updated Ticket Status Section */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">สถานะตั๋ว</span>
              {/* Show the current status on the right side of the header */}
              <span className={`badge ${pawn.ticket_status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                {pawn.ticket_status === 'active' ? 'ปกติ'
                  : pawn.ticket_status === 'lost' ? '⚠ ทำหาย'
                    : '⚠ ชำรุด'
                }
              </span>
            </div>

            <div className="pd-info-rows">
              {isActive && pawn.ticket_status === 'active' && (
                <div className="pd-status-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleTicketStatus('lost')}>
                    <span className="dot yellow"></span> แจ้งทำหาย
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleTicketStatus('damaged')}>
                    <span className="dot orange"></span> แจ้งชำรุด
                  </button>
                </div>
              )}
              {isActive && pawn.ticket_status !== 'active' && (
                <div className="pd-status-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleTicketStatus('active')}>
                    <span className="dot green"></span>คืนค่าปกติ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pd-right">
          {/* 2. Payment History Table with Icon */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ประวัติการจ่ายดอกเบี้ย</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th width="40"></th>
                    <th>งวดเดือน</th>
                    <th>วันที่จ่าย</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: 20 }}>ยังไม่มีประวัติการจ่าย</td></tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id}>
                        <td><IconCheckCircle /></td>
                        <td style={{ fontWeight: 500 }}>{thaiMonthShort(p.month)} {p.year}</td>
                        <td>{toBE(p.paid_date)}</td>
                        <td className="text-muted">{p.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Pending Payments Table */}
          {pendingMonths.length > 0 && (
            <div className="card" style={{ marginTop: 20, borderLeft: '4px solid var(--red)' }}>
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--red)' }}>ค้างชำระดอกเบี้ย</span>
                <span className="badge badge-red">ค้างจ่าย {pendingMonths.length} เดือน</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th width="40"></th>
                      <th>งวดเดือน</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingMonths.map((m, idx) => (
                      <tr key={idx}>
                        <td><IconXCircle /></td>
                        <td>{thaiMonthShort(m.month)} {m.year + 543}</td>
                        <td style={{ color: 'var(--red)' }}>เกินกำหนดชำระ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          title="ยืนยันการไถ่"
          body={`ตั๋ว ${formatTicket(pawn.ticket_number)} — ลูกค้ามารับทองคืนและชำระหนี้ครบแล้ว?`}
          confirmLabel="ไถ่"
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

function IconCheckCircle() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      backgroundColor: '#22c55e', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

function IconXCircle() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      backgroundColor: '#ea0c0cff', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  )
}

function IconCash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
}


