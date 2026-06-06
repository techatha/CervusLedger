import { useState, useEffect } from 'react'
import { ListPurchasedGold, ToggleStillExists } from 'wailsjs/go/handlers/PurchaseHandler.js'
import { toBE, formatBaht } from '@/utils/thai.js'
import StatCard from '@/components/StatCard'
import NewPurchaseModal from './NewPurchaseModal.jsx'
import PurchaseDetailModal from './PurchaseDetailModal.jsx'
import './PurchaseHistory.css'

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inventoryFilter, setInventoryFilter] = useState('all')
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ListPurchasedGold()
      setPurchases(data || [])
    } catch (e) {
      setError('ไม่สามารถโหลดข้อมูลประวัติการรับซื้อได้: ' + e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleToggle = async (item) => {
    try {
      const targetState = item.still_exists === 1 ? 0 : 1
      await ToggleStillExists(item.id, targetState)
      setPurchases(p => p.map(x => x.id === item.id ? { ...x, still_exists: targetState } : x))
    } catch (e) {
      alert('ไม่สามารถเปลี่ยนสถานะสินค้าได้: ' + e)
    }
  }

  const filteredPurchases = purchases.filter(item => {
    const matchesSearch =
      (item.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.type || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ? true :
        statusFilter === 'exists' ? item.still_exists === 1 :
          item.still_exists === 0

    const matchesInventory =
      inventoryFilter === 'all' ? true :
        inventoryFilter === 'inventory' ? item.is_inventory === 1 :
          item.is_inventory === 0

    return matchesSearch && matchesStatus && matchesInventory
  })

  const totalWeight = filteredPurchases.reduce((sum, item) => sum + (item.weight_baht || (item.weight_grams || 0) / 15.244), 0)
  const totalAmount = filteredPurchases.reduce((sum, item) => sum + (item.total_amount || 0), 0)

  return (
    <div className="page-view ph-page-view">
      <div className="page-header">
        <div>
          <div className="page-title">สต็อกของเก่า</div>
          <div className="page-meta">ดูและจัดการประวัติการรับซื้อทองคำจากลูกค้า</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewPurchaseModal(true)}>
          + รับซื้อทองใหม่
        </button>
      </div>

      {showNewPurchaseModal && (
        <NewPurchaseModal onClose={() => setShowNewPurchaseModal(false)} />
      )}

      {selectedPurchase && (
        <PurchaseDetailModal
          item={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          onUpdate={(updated) => {
            setSelectedPurchase(updated)
            setPurchases(prev => prev.map(p => p.id === updated.id ? updated : p))
          }}
        />
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* ─── 1. Filters (Moved to TOP) ───────────────────────────── */}
      <div className="card ph-filters-card" style={{ marginTop: '16px' }}>
        <div className="ph-filters">
          {/* Search */}
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">ค้นหา</label>
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="input search-input"
                placeholder="ชื่อลูกค้า หรือประเภททอง..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="form-group" style={{ flex: 1.5 }}>
            <label className="form-label">สถานะของทอง</label>
            <div className="ph-pill-row">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'exists', label: 'ยังอยู่ในร้าน' },
                { key: 'melted', label: 'ขาย/ละลายแล้ว' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`ph-pill ${statusFilter === key ? 'ph-pill-active' : ''}`}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory filter */}
          <div className="form-group" style={{ flex: 1.5 }}>
            <label className="form-label">การเข้าคลังสินค้า</label>
            <div className="ph-pill-row">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'inventory', label: 'นำเข้าคลัง' },
                { key: 'scrap', label: 'ไม่เข้าคลัง' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`ph-pill ${inventoryFilter === key ? 'ph-pill-active' : ''}`}
                  onClick={() => setInventoryFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Table ───────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '16px', padding: 0 }}></th>
                <th style={{ width: '110px' }}>วันที่</th>
                <th style={{ width: '220px' }}>ประเภททอง</th>
                <th style={{ width: '120px', textAlign: 'right' }}>น้ำหนัก (กรัม)</th>
                <th style={{ width: '130px', textAlign: 'right' }}>ยอดรับซื้อ</th>
                <th style={{ width: '145px', textAlign: 'center' }}>สถานะ</th>
                <th>หมายเหตุ</th>
                <th style={{ width: '130px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={8}>กำลังโหลดข้อมูล...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr className="loading-row"><td colSpan={8}>ไม่พบรายการที่ตรงตามเงื่อนไข</td></tr>
              ) : filteredPurchases.map((item) => (
                <tr 
                  key={item.id} 
                  className={item.still_exists === 0 ? 'ph-row-faded' : ''}
                  onClick={() => setSelectedPurchase(item)}
                >
                  <td style={{ width: '16px', padding: 0 }}></td>

                  {/* วันที่ */}
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {toBE(item.date)}
                  </td>

                  {/* ประเภททอง (แสดงเป็น Normal Text) */}
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.type || item.item_type || '—'} 
                  </td>

                  {/* น้ำหนัก (gram) */}
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--gold)' }}>
                    {item.weight_grams != null 
                      ? item.weight_grams.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                      : ((item.weight_baht || 0) * 15.244).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* ยอดซื้อ */}
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--amber)' }}>
                    {formatBaht(item.total_amount)}
                  </td>

                  {/* สถานะ */}
                  <td style={{ textAlign: 'center' }}>
                    {item.still_exists === 0 ? (
                      <span className="badge badge-muted">ขาย/ละลายแล้ว</span>
                    ) : item.is_inventory === 1 ? (
                      <span className="badge badge-blue">นำเข้าคลังแล้ว</span>
                    ) : (
                      <span className="badge badge-green" style={{ background: 'var(--green-bg, #dcfce7)', color: 'var(--green, #16a34a)' }}>มีของในร้าน</span>
                    )}
                  </td>

                  {/* หมายเหตุ */}
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {item.notes || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>

                  {/* ปุ่มเปลี่ยนสถานะ ไว้ท้ายสุด */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost ph-btn-toggle"
                      style={{ 
                        fontSize: '12px', 
                        padding: '6px 10px', 
                        height: 'auto', 
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggle(item)
                      }}
                      title="สลับสถานะ มีของในร้าน / ละลายแล้ว"
                    >
                      {item.still_exists === 1 ? 'นำไปหลอมแล้ว' : 'คืนสถานะมีของ'}
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spacer to push stats to bottom if table is short */}
      <div className="ph-spacer" />

      {/* ─── 3. Stats Summary (Kept at BOTTOM) ───────────────────── */}
      <div className="ph-bottom-sticky">
        <div className="ph-stats-row">
          <StatCard
            label="รายการรับซื้อ"
            value={filteredPurchases.length}
            unit="รายการ"
            color="blue"
            icon={<IconList />}
          />
          <StatCard
            label="น้ำหนักรวม"
            value={totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            unit="บาท"
            color="gold"
            icon={<IconScale />}
          />
          <StatCard
            label="ยอดจ่ายรวม"
            value={formatBaht(totalAmount)}
            color="green"
            icon={<IconCash />}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Icons ────────────────────────────────────────────────────────── */
function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconScale() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <path d="M6 7l-3 6h6l-3-6" />
      <path d="M18 7l-3 6h6l-3-6" />
      <path d="M20 21H4" />
    </svg>
  )
}

function IconCash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}