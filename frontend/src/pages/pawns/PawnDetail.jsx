import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  GetPawn,
  GetPawnPayments,
  GetPrincipalChanges,
  RedeemPawn,
  ForfeitPawn,
  UpdateTicketStatus,
} from 'wailsjs/go/handlers/PawnHandler'
import { GetCustomer } from 'wailsjs/go/handlers/CustomerHandler'
import { GetAllSettings } from 'wailsjs/go/handlers/SettingsHandler'
import PawnTicket from './PawnTicket'
import PawnInfoCard from './components/pawnDetail/PawnInfoCard'
import PawnFinancialCard from './components/pawnDetail/PawnFinancialCard'
import PawnStatusCard from './components/pawnDetail/PawnStatusCard'
import PawnPaymentHistoryCard from './components/pawnDetail/PawnPaymentHistoryCard'
import PawnPendingInterestCard from './components/pawnDetail/PawnPendingInterestCard'
import PawnPrincipalChangesCard from './components/pawnDetail/PawnPrincipalChangesCard'
import { formatTicket, pawnStatusBadge } from '@/utils/thai'
import { getPendingMonths, thaiMonthShort } from '@/utils/pawn'
import { getLocalISOString } from '@/utils/date'
import { RecordPaymentModal, PrincipalChangeForm } from './PrincipalChangeForm'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPrint, faHandshakeSlash, faMoneyBills } from '@fortawesome/free-solid-svg-icons'
import './PawnDetail.css'

export default function PawnDetail({ cartItems, setCartItems }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const pawnId = parseInt(id, 10)

  const [pawn, setPawn] = useState(null)
  const [payments, setPayments] = useState([])
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modal, setModal] = useState(null) // 'payment' | 'principal' | 'redeem' | 'forfeit'

  // Receipt state
  const [showTicket, setShowTicket] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [shop, setShop] = useState(null)
  const [loadingPrint, setLoadingPrint] = useState(false)

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

  // Receipt Function
  const handlePrintTicket = async () => {
    setLoadingPrint(true)
    try {
      const [cust, shopInfo] = await Promise.all([
        pawn.customer_id ? GetCustomer(pawn.customer_id) : Promise.resolve(null),
        GetAllSettings(),
      ])
      setCustomer(cust)
      setShop(shopInfo)
      setShowTicket(true)
    } catch (e) {
      setError('โหลดข้อมูลสำหรับพิมพ์ไม่สำเร็จ: ' + e)
    } finally {
      setLoadingPrint(false)
    }
  }

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
  const handlePayPendingInterest = (selectedIndexes) => {
    const itemsToAdd = selectedIndexes.map(idx => {
      const m = pendingMonths[idx]
      return {
        type: 'pawn_interest',
        label: `ชำระดอกเบี้ยตั๋ว #${formatTicket(pawn.ticket_number)}`,
        weight_baht: 0,
        price_per_baht: 0,
        total_amount: pawn.interest_amount,

        pawn_record_id: pawn.id,
        month: m.month,
        year: m.year,
        paid_date: getLocalISOString().slice(0, 10),
        notes: `งวด ${thaiMonthShort(m.month)} ${m.year + 543}`,
        interest_amount: pawn.interest_amount,
        customer_name: pawn.customer_name_display || pawn.customer_name || '',
        ticket_number: pawn.ticket_number
      }
    })

    navigate('/sales', { state: { addItems: itemsToAdd } })
  }

  const handleAddToCartPendingInterest = (selectedIndexes) => {
    const itemsToAdd = selectedIndexes.map(idx => {
      const m = pendingMonths[idx]
      return {
        type: 'pawn_interest',
        label: `ชำระดอกเบี้ยตั๋ว #${formatTicket(pawn.ticket_number)}`,
        weight_baht: 0,
        price_per_baht: 0,
        total_amount: pawn.interest_amount,

        pawn_record_id: pawn.id,
        month: m.month,
        year: m.year,
        paid_date: getLocalISOString().slice(0, 10),
        notes: `งวด ${thaiMonthShort(m.month)} ${m.year + 543}`,
        interest_amount: pawn.interest_amount,
        customer_name: pawn.customer_name_display || pawn.customer_name || '',
        ticket_number: pawn.ticket_number
      }
    })

    setCartItems(prev => [...prev, ...itemsToAdd])
    alert(`เพิ่มดอกเบี้ยค้างชำระ ${itemsToAdd.length} งวดลงในตะกร้าแล้ว`)
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
          <button className="btn btn-ghost btn-sm pd-back" onClick={() => navigate(-1)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            ย้อนกลับ
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

            <button className="btn btn-ghost" onClick={() => setModal('payment')}>
              <FontAwesomeIcon icon={faMoneyBills} /> จ่ายดอกเบี้ยล่วงหน้า
            </button>
            <button
              className="btn btn-ghost"
              onClick={handlePrintTicket}
              disabled={loadingPrint}
            >
              <FontAwesomeIcon icon={faPrint} /> {loadingPrint ? '...' : 'พิมพ์ตั๋วจำนำ'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="pd-layout">
        {/* ── Left: Pawn Info ── */}
        <div className="pd-left">
          <PawnInfoCard
            pawn={pawn}
            pawnId={pawnId}
            isActive={isActive}
            onReload={load}
            onError={setError}
          />

          <PawnFinancialCard
            pawn={pawn}
            isActive={isActive}
            onReload={load}
            onError={setError}
          />

          <PawnStatusCard
            pawn={pawn}
            isActive={isActive}
            onStatusChange={handleTicketStatus}
          />
          <button className="btn btn-ghost" onClick={() => setModal('principal')}>
            เปลี่ยนเงินต้น
          </button>

          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button className="btn btn-ghost" onClick={() => setModal('redeem')}
              style={{ flex: 1, color: 'var(--blue)', borderColor: 'var(--blue)' }}>
              ไถ่ของ
            </button>
            <button className="btn btn-danger-ghost" onClick={() => setModal('forfeit')}
              style={{ flex: 1 }}>
              ขาด
            </button>
          </div>
        </div>

        <div className="pd-right">
          {pawn.status === 'ขาด' && (
            <div className="pd-forfeited-banner">
              <div className="pd-forfeited-banner-icon">
              <FontAwesomeIcon icon={faHandshakeSlash} />
              </div>
              <div className="pd-forfeited-banner-text">
                <strong>ทรัพย์สินหลุดจำนำแล้ว</strong>
                <span>รายการจำนำนี้ขาดส่งดอกเบี้ยและได้เปลี่ยนสถานะเป็นหลุดจำนำแล้ว</span>
              </div>
            </div>
          )}
          <PawnPaymentHistoryCard payments={payments} />

          <PawnPendingInterestCard
            pendingMonths={pendingMonths}
            pawn={pawn}
            onPayPendingInterest={handlePayPendingInterest}
            onAddToCart={handleAddToCartPendingInterest}
            cartItems={cartItems}
          />

          <PawnPrincipalChangesCard changes={changes} />
        </div>
      </div>


      {/* Modals */}
      {
        modal === 'payment' && (
          <RecordPaymentModal
            pawn={pawn}
            customerName={pawn.customer_name_display || ''}
            onSaved={() => { setModal(null); load() }}
            onClose={() => setModal(null)}
          />
        )
      }
      {
        modal === 'principal' && (
          <PrincipalChangeForm
            pawn={{ ...pawn, current_principal: current }}
            onSaved={() => { setModal(null); load() }}
            onClose={() => setModal(null)}
          />
        )
      }
      {
        modal === 'redeem' && (
          <ConfirmModal
            title="ยืนยันการไถ่"
            body={`ตั๋ว ${formatTicket(pawn.ticket_number)} — ลูกค้ามารับทองคืนและชำระหนี้ครบแล้ว?`}
            confirmLabel="ไถ่"
            confirmStyle={{ background: 'var(--blue)', color: '#fff', border: 'none' }}
            onConfirm={handleRedeem}
            onClose={() => setModal(null)}
          />
        )
      }
      {
        modal === 'forfeit' && (
          <ConfirmModal
            title="ยืนยันการขาด"
            body={`ตั๋ว ${formatTicket(pawn.ticket_number)} — ลูกค้าหมดสิทธิ์ไถ่ถอนแล้ว?`}
            confirmLabel="ขาด"
            confirmStyle={{ background: 'var(--red)', color: '#fff', border: 'none' }}
            onConfirm={handleForfeit}
            onClose={() => setModal(null)}
          />
        )
      }
      {/* Pawn Ticket Print */}
      {
        showTicket && shop && (
          <PawnTicket
            pawn={{ ...pawn, current_principal: current }}
            customer={customer}
            shop={shop}
            onClose={() => setShowTicket(false)}
          />
        )
      }
    </div >
  )
}

/* ─── Sub-components ──────────────────────────────────────────────── */
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

