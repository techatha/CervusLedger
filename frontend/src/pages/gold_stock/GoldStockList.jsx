import { useState, useEffect, useCallback } from 'react'
import {
  ListGoldItems,
  DeleteGoldItem,
  ListStockLogs,
} from 'wailsjs/go/handlers/GoldItemHandler'
import { parseWeightToBaht } from '@/utils/number'
import GoldStockForm from './GoldStockForm'
import GoldStockWizard from './component/GoldStockWizard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpFromBracket, faPlus } from '@fortawesome/free-solid-svg-icons'
import './GoldStockList.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'อื่นๆ'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

function amountDelta(current, previous) {
  if (previous == null) return 'neutral'
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'neutral'
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GoldStockList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [stockLogs, setStockLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [editedAmounts, setEditedAmounts] = useState({})
  const [exporting, setExporting] = useState(false)

  const [wizardOpen, setWizardOpen] = useState(false)

  const loadCatalog = useCallback(async () => {
    try {
      const data = await ListGoldItems('')
      setItems(data || [])
    } catch (e) {
      setError('โหลดรายการสินค้าไม่สำเร็จ: ' + e)
    }
  }, [])

  const loadStockLogsData = useCallback(async (monthStr) => {
    setAuditLoading(true)
    setError(null)
    try {
      const logDate = `${monthStr}-01`
      const data = await ListStockLogs(logDate)
      setStockLogs(data || [])
      const amounts = {}
      if (data) data.forEach(log => { amounts[log.gold_item_id] = String(log.amount) })
      setEditedAmounts(amounts)
    } catch (e) {
      setError('โหลดข้อมูลสต็อกไม่สำเร็จ: ' + e)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([loadCatalog(), loadStockLogsData(selectedMonth)])
      setLoading(false)
    }
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadStockLogsData(selectedMonth)
  }, [selectedMonth, loadStockLogsData])

  const itemById = {}
  items.forEach(item => { itemById[item.id] = item })

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await DeleteGoldItem(confirmDelete.id)
      setConfirmDelete(null)
      await Promise.all([loadCatalog(), loadStockLogsData(selectedMonth)])
    } catch (e) {
      setError(String(e))
      setConfirmDelete(null)
    }
  }

  const handleAmountChange = (goldItemId, val) => {
    setEditedAmounts(p => ({ ...p, [goldItemId]: val }))
  }

  const handleExport = async () => {
    setExporting(true)
    // TODO: implement export
    setTimeout(() => setExporting(false), 1500)
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  const auditGroups = groupBy(stockLogs, 'type')
  const typeKeys = Object.keys(auditGroups)

  const openWizard = () => {
    setWizardOpen(true)
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalQuantity = stockLogs.reduce((s, log) => s + (parseInt(editedAmounts[log.gold_item_id]) || 0), 0)
  const totalWeight = stockLogs.reduce((s, log) => {
    return s + (parseWeightToBaht(log.subtype) * (parseInt(editedAmounts[log.gold_item_id]) || 0))
  }, 0)

  return (
    <div className="page-view">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">สต็อกทองในร้าน</div>
          <div className="page-meta">
            {`ตรวจนับประจำเดือน ${selectedMonth} · ${totalQuantity} ชิ้น · ${totalWeight.toFixed(2)} บาททอง · ${stockLogs.length} SKU`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
            <FontAwesomeIcon icon={faArrowUpFromBracket} />
            {exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel'}
          </button>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <FontAwesomeIcon icon={faPlus} /> เพิ่มทะเบียนทองใหม่
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Summary Strip ────────────────────────────────────────── */}
      <div className="gl-summary">
        <StatCard label="จำนวนชิ้นทั้งหมด" value={totalQuantity} sub="ชิ้น / อัน" color="green" />
        <StatCard label="น้ำหนักทองรวม" value={totalWeight.toFixed(2)} sub="บาททอง" color="gold" />
        <StatCard label="จำนวน SKU" value={stockLogs.length} sub="รายการที่ตรวจนับ" color="muted" />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="gl-audit-toolbar">
        <div className="gl-audit-controls">
          <span className="gl-audit-month-label">เดือน</span>
          <input
            type="month"
            className="input"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: 170 }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-primary"
          onClick={openWizard}
          disabled={auditLoading || stockLogs.length === 0}
        >
          บันทึกสต็อกประจำเดือน
        </button>
      </div>

      {/* ── Per-Type Sections ────────────────────────────────────── */}
      {(loading || auditLoading) ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          กำลังโหลดข้อมูลสต็อก...
        </div>
      ) : stockLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-text">ยังไม่มีสินค้าในทะเบียนให้ตรวจนับ</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal('new')}>
            <FontAwesomeIcon icon={faPlus} /> เพิ่มทะเบียนทองใหม่
          </button>
        </div>
      ) : (
        typeKeys.map(mainType => {
          const logs = auditGroups[mainType]
          const groupQty = logs.reduce((s, log) => s + (parseInt(editedAmounts[log.gold_item_id]) || 0), 0)
          const groupWeight = logs.reduce((s, log) => {
            return s + (parseWeightToBaht(log.subtype) * (parseInt(editedAmounts[log.gold_item_id]) || 0))
          }, 0)

          return (
            <div key={mainType} className="gl-type-section">
              {/* Editorial type heading — no card/box */}
              <div className="gl-type-heading">
                <span className="gl-type-heading-name">{mainType}</span>
                <span className="gl-type-heading-count">{logs.length} รายการ</span>
                <span className="gl-type-heading-summary">
                  {groupQty} ชิ้น · {groupWeight.toFixed(2)} บาททอง
                </span>
              </div>

              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>รุ่น / น้ำหนัก (Subtype)</th>
                        <th>น้ำหนักเดี่ยว (บาท)</th>
                        <th>คงเหลือ (ชิ้น)</th>
                        <th>น้ำหนักรวม (บาท)</th>
                        <th>บันทึกล่าสุด</th>
                        <th style={{ width: 100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => {
                        const amtStr = editedAmounts[log.gold_item_id] || ''
                        const amtInt = parseInt(amtStr) || 0
                        const estWeight = parseWeightToBaht(log.subtype)
                        const totalWeightRow = estWeight * amtInt
                        const history = log.history || []
                        const catalogItem = itemById[log.gold_item_id]

                        return (
                          <tr key={log.gold_item_id}>
                            <td className="gl-index">{index + 1}</td>
                            <td className="gl-subtype">{log.subtype}</td>
                            <td className="gl-unit-weight">
                              {estWeight > 0 ? estWeight.toFixed(4) : '—'}
                            </td>
                            <td className="gl-amount">
                              <input
                                type="number"
                                min="0"
                                className="input gl-audit-input-amount"
                                value={amtStr}
                                placeholder="0"
                                onChange={e => handleAmountChange(log.gold_item_id, e.target.value)}
                              />
                            </td>
                            <td className="gl-total-weight">
                              {totalWeightRow > 0 ? totalWeightRow.toFixed(4) : '—'}
                            </td>
                            <td className="gl-history">
                              <HistoryMiniChart history={history} />
                            </td>
                            <td className="gl-row-actions" onClick={e => e.stopPropagation()}>
                              {catalogItem && (
                                <>
                                  <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => setModal(catalogItem)}
                                    title="แก้ไข"
                                  >
                                    แก้ไข
                                  </button>
                                  <button
                                    className="btn btn-danger-ghost btn-xs"
                                    onClick={() => setConfirmDelete(catalogItem)}
                                    title="ลบ"
                                  >
                                    ลบ
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })
      )}

      {wizardOpen && (
        <GoldStockWizard
          selectedMonth={selectedMonth}
          stockLogs={stockLogs}
          editedAmounts={editedAmounts}
          onClose={() => setWizardOpen(false)}
          onSaved={(newAmounts) => {
            setEditedAmounts(newAmounts)
            setWizardOpen(false)
            loadStockLogsData(selectedMonth)
          }}
        />
      )}

      {/* ── Form Modal ───────────────────────────────────────────── */}
      {modal !== null && (
        <GoldStockForm
          item={modal === 'new' ? null : modal}
          onSaved={async () => {
            setModal(null)
            await Promise.all([loadCatalog(), loadStockLogsData(selectedMonth)])
          }}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Confirm Delete ───────────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">ยืนยันการลบ</div>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                ต้องการลบ{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {confirmDelete.type} {confirmDelete.subtype}
                </strong>{' '}
                ออกจากทะเบียนสินค้า?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
              <button
                className="btn"
                style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                onClick={handleDelete}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── History Mini Chart ───────────────────────────────────────────────────────
function HistoryMiniChart({ history }) {
  if (!history || history.length === 0) {
    return <span className="gl-history-empty">ยังไม่มีบันทึก</span>
  }

  const recent = [...history].slice(-6).reverse()

  return (
    <div className="gl-history-chips">
      {recent.map((entry, i) => {
        const prev = recent[i + 1]
        const delta = amountDelta(entry.amount, prev?.amount)
        return (
          <div key={i} className={`gl-history-chip gl-history-chip-${delta}`} title={entry.log_date}>
            <span className="gl-history-chip-date">{entry.log_date?.slice(0, 7)}</span>
            <span className="gl-history-chip-val">{entry.amount}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className={`gl-stat gl-stat-${color}`}>
      <div className="gl-stat-value">{value}</div>
      <div className="gl-stat-label">{label}</div>
      {sub && <div className="gl-stat-sub">{sub}</div>}
    </div>
  )
}