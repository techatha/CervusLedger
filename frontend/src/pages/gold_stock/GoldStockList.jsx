import { useState, useEffect, useCallback } from 'react'
import {
  ListGoldItems,
  DeleteGoldItem,
  ListStockLogs,
  RecordStockLog,
} from '../../../wailsjs/go/handlers/GoldItemHandler'
import { toBE } from '../../utils/thai'
import GoldStockForm from './GoldStockForm'
import './GoldStockList.css'

export default function GoldStockList() {
  const [activeTab, setActiveTab] = useState('catalog') // 'catalog' | 'audit'
  
  // Catalog states
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [modal,   setModal]   = useState(null) // null | 'new' | GoldItem (edit)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Audit states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${month}` // e.g. "2026-05"
  })
  const [stockLogs, setStockLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [editedAmounts, setEditedAmounts] = useState({}) // { gold_item_id: amountStr }
  const [savingAudit, setSavingAudit] = useState(false)

  // Load catalog items
  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ListGoldItems('')
      setItems(data || [])
    } catch (e) {
      setError('โหลดรายการสินค้าไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load stock logs for selected month
  const loadStockLogsData = useCallback(async (monthStr) => {
    setAuditLoading(true)
    setError(null)
    try {
      const logDate = `${monthStr}-01` // standard first day of month
      const data = await ListStockLogs(logDate)
      setStockLogs(data || [])
      
      const amounts = {}
      if (data) {
        data.forEach(log => {
          amounts[log.gold_item_id] = String(log.amount)
        })
      }
      setEditedAmounts(amounts)
    } catch (e) {
      setError('โหลดข้อมูลสต็อกไม่สำเร็จ: ' + e)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // Trigger loads on mount or dependency changes
  useEffect(() => {
    if (activeTab === 'catalog') {
      loadCatalog()
    } else {
      loadStockLogsData(selectedMonth)
    }
  }, [activeTab, selectedMonth, loadCatalog, loadStockLogsData])

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await DeleteGoldItem(confirmDelete.id)
      setConfirmDelete(null)
      loadCatalog()
    } catch (e) {
      setError(String(e))
      setConfirmDelete(null)
    }
  }

  const handleAmountChange = (goldItemId, val) => {
    setEditedAmounts(p => ({
      ...p,
      [goldItemId]: val
    }))
  }

  const handleSaveAudit = async () => {
    setSavingAudit(true)
    setError(null)
    try {
      const logDate = `${selectedMonth}-01`
      for (const log of stockLogs) {
        const amtStr = editedAmounts[log.gold_item_id]
        const amount = parseInt(amtStr) || 0
        await RecordStockLog({
          gold_item_id: log.gold_item_id,
          amount: amount,
          log_date: logDate,
        })
      }
      // Reload updated records
      await loadStockLogsData(selectedMonth)
      alert('บันทึกสต็อกสินค้าประจำเดือนเสร็จเรียบร้อยแล้ว!')
    } catch (e) {
      setError('บันทึกสต็อกไม่สำเร็จ: ' + e)
    } finally {
      setSavingAudit(false)
    }
  }

  // Summary stats calculations
  // Catalog tab: unique specifications
  const totalUniqueSpecs = items.length

  // Audit tab: live sums from input states
  const totalQuantity = stockLogs.reduce((s, log) => s + (parseInt(editedAmounts[log.gold_item_id]) || 0), 0)
  const totalWeight = stockLogs.reduce((s, log) => s + ((log.weight_baht || 0) * (parseInt(editedAmounts[log.gold_item_id]) || 0)), 0)

  return (
    <div className="page-view">
      <div className="page-header">
        <div>
          <div className="page-title">สต็อกทองคำ</div>
          <div className="page-meta">
            {activeTab === 'catalog' 
              ? `ทะเบียนสินค้าที่ไม่ซ้ำทั้งหมด ${totalUniqueSpecs} รายการ`
              : `ตรวจนับประจำเดือน ${selectedMonth} · จำนวนรวม ${totalQuantity} ชิ้น · น้ำหนักรวม ${totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} บาททอง`
            }
          </div>
        </div>
        {activeTab === 'catalog' && (
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <IconPlus /> เพิ่มทะเบียนทองใหม่
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="gl-tabs-container">
        <button 
          className={`gl-tab-btn ${activeTab === 'catalog' ? 'gl-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          ทะเบียนทองคำ (SKUs)
        </button>
        <button 
          className={`gl-tab-btn ${activeTab === 'audit' ? 'gl-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          ตรวจนับสต็อกประจำเดือน
        </button>
      </div>

      {/* Summary cards */}
      {activeTab === 'catalog' ? (
        <div className="gl-summary">
          <SummaryCard
            label="ชนิดสินค้าทั้งหมด"
            value={totalUniqueSpecs}
            sub="รายการที่ลงทะเบียนไว้"
            color="gold"
          />
        </div>
      ) : (
        <div className="gl-summary">
          <SummaryCard
            label="จำนวนชิ้นทั้งหมด"
            value={totalQuantity}
            sub="ชิ้น/อัน"
            color="green"
          />
          <SummaryCard
            label="น้ำหนักทองรวม"
            value={`${totalWeight.toFixed(2)} บาท`}
            sub="คำนวณจากน้ำหนัก × จำนวน"
            color="gold"
          />
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {activeTab === 'catalog' ? (
        // CATALOG VIEW
        <div className="card" style={{ marginTop: 20 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ประเภท</th>
                  <th style={{ textAlign: 'right' }}>น้ำหนักเดี่ยว (บาท)</th>
                  <th>วันที่เพิ่ม</th>
                  <th style={{ width: 110 }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row"><td colSpan={5}>กำลังโหลด...</td></tr>
                ) : items.length === 0 ? (
                  <tr className="loading-row">
                    <td colSpan={5}>
                      ยังไม่มีรายการทองในระบบทะเบียน
                    </td>
                  </tr>
                ) : items.map((item, i) => (
                  <tr
                    key={item.id}
                    onClick={() => setModal(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="gl-index">{i + 1}</td>
                    <td className="gl-type">{item.type}</td>
                    <td className="gl-weight" style={{ textAlign: 'right' }}>{item.weight_baht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td className="gl-date">{toBE(item.created_at)}</td>
                    <td className="gl-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal(item)}>แก้ไข</button>
                      <button className="btn btn-danger-ghost btn-xs" onClick={() => setConfirmDelete(item)}>ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // AUDIT VIEW
        <div>
          <div className="gl-audit-header">
            <div className="gl-audit-controls">
              <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>เลือกเดือนประจำสต็อก:</span>
              <input 
                type="month" 
                className="input" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
                style={{ width: 180 }}
              />
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveAudit} 
              disabled={savingAudit || auditLoading}
            >
              {savingAudit ? 'กำลังบันทึก...' : 'บันทึกสต็อกประจำเดือน'}
            </button>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ประเภท</th>
                    <th style={{ textAlign: 'right' }}>น้ำหนักเดี่ยว (บาท)</th>
                    <th style={{ textAlign: 'right', width: 150 }}>จำนวนคงเหลือ (ชิ้น)</th>
                    <th style={{ textAlign: 'right' }}>น้ำหนักรวม (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <tr className="loading-row"><td colSpan={5}>กำลังโหลดข้อมูลสต็อก...</td></tr>
                  ) : stockLogs.length === 0 ? (
                    <tr className="loading-row">
                      <td colSpan={5}>
                        ไม่มีสินค้าในทะเบียนให้ตรวจนับ (กรุณาลงทะเบียนทองที่แท็บทะเบียนสินค้าก่อน)
                      </td>
                    </tr>
                  ) : stockLogs.map((log, i) => {
                    const amtStr = editedAmounts[log.gold_item_id] || ''
                    const amtInt = parseInt(amtStr) || 0
                    const totalWeightRow = (log.weight_baht || 0) * amtInt

                    return (
                      <tr key={log.gold_item_id}>
                        <td className="gl-index">{i + 1}</td>
                        <td className="gl-type">{log.type}</td>
                        <td className="gl-weight" style={{ textAlign: 'right' }}>
                          {log.weight_baht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input 
                            type="number" 
                            min="0" 
                            className="input gl-audit-input-amount" 
                            value={amtStr}
                            placeholder="0"
                            onChange={e => handleAmountChange(log.gold_item_id, e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--gold)', fontSize: '15px' }}>
                          {totalWeightRow.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {modal !== null && (
        <GoldStockForm
          item={modal === 'new' ? null : modal}
          onSaved={() => { setModal(null); loadCatalog() }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">ยืนยันการลบ</div>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                ต้องการลบ <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.type}</strong>
                {' '}({confirmDelete.weight_baht} บาท) ออกจากทะเบียนสินค้า?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
              <button className="btn" style={{ background: 'var(--red)', color: '#fff', border: 'none' }} onClick={handleDelete}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, color }) {
  const colors = {
    green: { bg: 'var(--green-bg)',  text: 'var(--green)'  },
    gold:  { bg: 'var(--bg-hover)', text: 'var(--gold)'   },
    muted: { bg: 'var(--bg-hover)', text: 'var(--text-muted)' },
  }
  const c = colors[color] || colors.muted
  return (
    <div className="gl-stat" style={{ background: c.bg, border: '1px solid var(--border)' }}>
      <div className="gl-stat-value" style={{ color: c.text }}>{value}</div>
      <div className="gl-stat-label">{label}</div>
      {sub && <div className="gl-stat-sub">{sub}</div>}
    </div>
  )
}

function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
