import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GetCustomer } from 'wailsjs/go/customer_handler/CustomerHandler'
import { GetCustomerPawnRecords } from 'wailsjs/go/pawn_handler/PawnHandler'
import { GetCustomerPurchaseRecords } from 'wailsjs/go/purchase_handler/PurchaseHandler'
import { fullName, formatBaht } from '@/utils/thai'
import { getPendingMonths } from '@/utils/pawn'
import CustomerForm from './CustomerForm'
import CustomerInfoCard from './components/customerProfile/CustomerInfoCard'
import CustomerAddressCard from './components/customerProfile/CustomerAddressCard'
import StatCard from '@/components/StatCard'
import CustomerPawnHistoryCard from './components/customerProfile/CustomerPawnHistoryCard'
import CustomerGoldPurchasesCard from './components/customerProfile/CustomerGoldPurchasesCard'
import './CustomerProfile.css'

export default function CustomerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const custId = parseInt(id, 10)

  const [customer, setCustomer] = useState(null)
  const [pawns, setPawns] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      GetCustomer(custId),
      GetCustomerPawnRecords(custId),
      GetCustomerPurchaseRecords(custId),
    ])
      .then(([c, p, pur]) => {
        setCustomer(c)
        setPawns(p || [])
        setPurchases(pur || [])
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
          <button className="btn btn-ghost btn-sm cp-back" onClick={() => navigate(-1)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            ย้อนกลับ
          </button>
          <div>
            <div className="page-title">{fullName(customer)}</div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          แก้ไขข้อมูล
        </button>
      </div>

      <div className="cp-layout">
        {/* ── Top Section: Side-by-Side Info ── */}
        <div className="cp-info-container" style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
          <CustomerInfoCard customer={customer} />
          <CustomerAddressCard customer={customer} />
        </div>

        {/* 1. Stats Row */}
        <div className="cp-stat-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <StatCard
                label="จำนำที่ยังอยู่"
                value={activePawns.length}
                unit="รายการ"
                color="green"
                variant="profile"
              />
              <StatCard
                label="ค้างจ่ายดอกเบี้ย"
                value={overdueCount}
                unit="รายการ"
                color="red"
                variant="profile"
              />
              <StatCard
                label="ยอดรวมปัจจุบัน"
                value={formatBaht(totalActive)}
                color="gold"
                variant="profile"
              />
              <StatCard
                label="รายการจำนำทั้งหมด"
                value={pawns.length}
                unit="รายการ"
                color="muted"
                variant="profile"
              />
            </div>

        {/* ── Bottom Section: History Table ── */}
        <div className="cp-history-section">
          <CustomerPawnHistoryCard pawns={pawns} />
          <CustomerGoldPurchasesCard purchases={purchases} />
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


