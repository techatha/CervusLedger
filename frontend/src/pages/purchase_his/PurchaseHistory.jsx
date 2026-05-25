import { useState, useEffect } from 'react'
import { ListPurchasedGold, ToggleStillExists } from 'wailsjs/go/handlers/PurchaseHandler.js'
import { toBE, formatBaht } from '@/utils/thai.js'
import './PurchaseHistory.css'

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'exists' | 'melted'
  const [inventoryFilter, setInventoryFilter] = useState('all') // 'all' | 'inventory' | 'scrap'

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

  useEffect(() => {
    loadData()
  }, [])

  const handleToggle = async (item) => {
    try {
      const targetState = item.still_exists === 1 ? 0 : 1
      await ToggleStillExists(item.id, targetState)
      
      // Update local state directly for responsive feedback
      setPurchases(p => p.map(x => x.id === item.id ? { ...x, still_exists: targetState } : x))
    } catch (e) {
      alert('ไม่สามารถเปลี่ยนสถานะสินค้าได้: ' + e)
    }
  }

  // Filter logic
  const filteredPurchases = purchases.filter(item => {
    const nameMatch = (item.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const typeMatch = (item.type || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSearch = nameMatch || typeMatch

    let matchesStatus = true
    if (statusFilter === 'exists') {
      matchesStatus = item.still_exists === 1
    } else if (statusFilter === 'melted') {
      matchesStatus = item.still_exists === 0
    }

    let matchesInventory = true
    if (inventoryFilter === 'inventory') {
      matchesInventory = item.is_inventory === 1
    } else if (inventoryFilter === 'scrap') {
      matchesInventory = item.is_inventory === 0
    }

    return matchesSearch && matchesStatus && matchesInventory
  })

  // Summary stats
  const totalWeight = filteredPurchases.reduce((sum, item) => sum + (item.weight_baht || 0), 0)
  const totalAmount = filteredPurchases.reduce((sum, item) => sum + (item.total_amount || 0), 0)

  return (
    <div className="page-view">
      <div className="page-header">
        <div>
          <div className="page-title">รับซื้อของเก่า</div>
          <div className="page-meta">ดูและจัดการประวัติการรับซื้อทองคำจากลูกค้า</div>
        </div>
      </div>

      <div className="purchase-history-container">
        {error && <div className="alert alert-error">{error}</div>}

      {/* Control panel (Filters) */}
      <div className="ph-controlscard card">
        <div className="ph-filters">
          <div className="form-group ph-search-group">
            <label className="form-label">ค้นหา</label>
            <input
              type="text"
              className="input ph-search-input"
              placeholder="ค้นหาชื่อลูกค้า หรือประเภททอง..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">สถานะของทอง</label>
            <div className="ph-tab-row">
              <button
                className={`ph-filter-btn ${statusFilter === 'all' ? 'ph-filter-btn-active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                ทั้งหมด
              </button>
              <button
                className={`ph-filter-btn ${statusFilter === 'exists' ? 'ph-filter-btn-active' : ''}`}
                onClick={() => setStatusFilter('exists')}
              >
                ยังอยู่ในร้าน
              </button>
              <button
                className={`ph-filter-btn ${statusFilter === 'melted' ? 'ph-filter-btn-active' : ''}`}
                onClick={() => setStatusFilter('melted')}
              >
                ขาย/ละลายแล้ว
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">การเข้าคลังสินค้า</label>
            <div className="ph-tab-row">
              <button
                className={`ph-filter-btn ${inventoryFilter === 'all' ? 'ph-filter-btn-active' : ''}`}
                onClick={() => setInventoryFilter('all')}
              >
                ทั้งหมด
              </button>
              <button
                className={`ph-filter-btn ${inventoryFilter === 'inventory' ? 'ph-filter-btn-active' : ''}`}
                onClick={() => setInventoryFilter('inventory')}
              >
                นำเข้าคลัง
              </button>
              <button
                className={`ph-filter-btn ${inventoryFilter === 'scrap' ? 'ph-filter-btn-active' : ''}`}
                onClick={() => setInventoryFilter('scrap')}
              >
                ไม่เข้าคลัง
              </button>
            </div>
          </div>
        </div>

        {/* Live filtered summary metrics */}
        <div className="ph-summary-row">
          <div className="ph-summary-item">
            <span className="ph-summary-label">จำนวนรายการ</span>
            <span className="ph-summary-val">{filteredPurchases.length} รายการ</span>
          </div>
          <div className="ph-summary-item">
            <span className="ph-summary-label">น้ำหนักรวม</span>
            <span className="ph-summary-val ph-val-gold">{totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} บาท</span>
          </div>
          <div className="ph-summary-item">
            <span className="ph-summary-label">ยอดจ่ายรวม</span>
            <span className="ph-summary-val ph-val-green">{formatBaht(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="table-wrap">
          <table className="table ph-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th style={{ width: '120px' }}>วันที่รับซื้อ</th>
                <th>ลูกค้า</th>
                <th>ประเภททอง</th>
                <th style={{ textAlign: 'right', width: '130px' }}>น้ำหนัก (บาท)</th>
                <th style={{ textAlign: 'right', width: '150px' }}>ยอดราคารวม</th>
                <th style={{ width: '130px', textAlign: 'center' }}>คลังสินค้า</th>
                <th style={{ width: '150px', textAlign: 'center' }}>ยังอยู่ในร้าน?</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={9}>กำลังโหลดข้อมูล...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan={9}>
                    ไม่พบรายการรับซื้อที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              ) : filteredPurchases.map((item, idx) => (
                <tr key={item.id}>
                  <td className="ph-index">{idx + 1}</td>
                  <td className="ph-date">{toBE(item.date)}</td>
                  <td className="ph-customer">
                    <span className="ph-cust-name">{item.customer_name}</span>
                  </td>
                  <td className="ph-type">
                    <span className="badge badge-gold" style={{ fontSize: '12px' }}>
                      {item.type}
                    </span>
                  </td>
                  <td className="ph-weight" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {item.weight_baht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </td>
                  <td className="ph-amount" style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--red)' }}>
                    {formatBaht(item.total_amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.is_inventory === 1 ? (
                      <span className="badge badge-purple" style={{ fontSize: '11px' }}>นำเข้าคลัง</span>
                    ) : (
                      <span className="badge badge-muted" style={{ fontSize: '11px', opacity: 0.6 }}>ไม่เข้าคลัง</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {/* Beautiful Toggle Switch */}
                      <label className="ph-switch">
                        <input
                          type="checkbox"
                          checked={item.still_exists === 1}
                          onChange={() => handleToggle(item)}
                        />
                        <span className="ph-slider"></span>
                      </label>
                      <span className="ph-switch-label" style={{ fontSize: '10px', color: item.still_exists === 1 ? 'var(--green)' : 'var(--text-disabled)', fontWeight: 'bold' }}>
                        {item.still_exists === 1 ? 'มีของในร้าน' : 'ขาย/ละลายแล้ว'}
                      </span>
                    </div>
                  </td>
                  <td className="ph-notes" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {item.notes || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
