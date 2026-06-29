import { useState, useEffect, useCallback } from 'react'
import {
  ListGoldItems,
  DeleteGoldItem,
  ListStockLogs,
} from 'wailsjs/go/gold_item_handler/GoldItemHandler'
import GoldStockForm from './GoldStockForm'
import GoldStockWizard from './component/GoldStockWizard'
import GoldStockHistory from './GoldStockHistory'
import HistoryMiniChart from './component/HistoryMiniChart'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpFromBracket, faPlus, faClockRotateLeft, faFilePen } from '@fortawesome/free-solid-svg-icons'
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GoldStockList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(null)

  // History overlay state — which type is open
  const [historyType, setHistoryType] = useState(null) // null = closed, string = type name

  // All stock logs (unfiltered) — passed to history overlay
  const [allStockLogs, setAllStockLogs] = useState([])
  // Edited amounts keyed by item.id (for current display only)
  const [editedAmounts, setEditedAmounts] = useState({})

  const [auditLoading, setAuditLoading] = useState(false)

  // ── Load catalog ────────────────────────────────────────────────────────────
  const loadCatalog = useCallback(async () => {
    try {
      const data = await ListGoldItems('')
      setItems(data || [])
    } catch (e) {
      setError('โหลดรายการสินค้าไม่สำเร็จ: ' + e)
    }
  }, [])

  // ── Load ALL stock logs (no month filter — overlay handles filtering) ────────
  const loadAllStockLogs = useCallback(async () => {
    setAuditLoading(true)
    setError(null)
    try {
      const data = await ListStockLogs('')
      setAllStockLogs(data || [])

      // Build latest-amount map: for each item, use the most recent log
      const latestByItem = {}
        ; (data || []).forEach(log => {
          const existing = latestByItem[log.gold_item_id]
          if (!existing || log.log_date > existing.log_date) {
            latestByItem[log.gold_item_id] = log
          }
        })
      const amounts = {}
      Object.entries(latestByItem).forEach(([id, log]) => {
        amounts[id] = String(log.amount)
      })
      setEditedAmounts(amounts)
    } catch (e) {
      setError('โหลดข้อมูลสต็อกไม่สำเร็จ: ' + e)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // ── Mount ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([loadCatalog(), loadAllStockLogs()])
      setLoading(false)
    }
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await DeleteGoldItem(confirmDelete.id)
      setConfirmDelete(null)
      await Promise.all([loadCatalog(), loadAllStockLogs()])
    } catch (e) {
      setError(String(e))
      setConfirmDelete(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setTimeout(() => setExporting(false), 1500) // TODO: implement
  }

  // ── Grouping & computation ──────────────────────────────────────────────────
  const auditGroups = groupBy(items, 'type')
  const typeKeys = Object.keys(auditGroups)

  const computedGroups = typeKeys.map(mainType => {
    const groupItems = auditGroups[mainType]

    const groupQty = groupItems.reduce((s, item) => s + (parseInt(editedAmounts[item.id]) || 0), 0)
    const groupWeight = groupItems.reduce((s, item) => {
      return s + ((item.weight_grams || 0) * (parseInt(editedAmounts[item.id]) || 0))
    }, 0)

    const rows = groupItems.map((item, index) => {
      const amtStr = editedAmounts[item.id] || ''
      const history = allStockLogs
        .filter(l => l.gold_item_id === item.id)
        .sort((a, b) => a.log_date.localeCompare(b.log_date))

      return {
        gold_item_id: item.id,
        index: index + 1,
        subtype: item.subtype,
        weight: item.weight_grams || 0,
        purity: item.purity || '—',
        amtStr,
        history,
        catalogItem: item,
      }
    })

    return { mainType, logsCount: groupItems.length, groupQty, groupWeight, rows }
  })

  return (
    <div className="page-view">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">สต็อกทองในร้าน</div>
          <div className="page-meta">
            {`${items.length} SKU · ${computedGroups.length} ประเภท`}
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
          <button
            className="btn btn-primary"
            onClick={() => setWizardOpen(true)}
            disabled={auditLoading || items.length === 0}
          >
            <FontAwesomeIcon icon={faFilePen} />
            เริ่มตรวจนับสต็อก
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Per-Type Sections ────────────────────────────────────── */}
      {(loading || auditLoading) ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          กำลังโหลดข้อมูลสต็อก...
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-text">ยังไม่มีสินค้าในทะเบียนให้ตรวจนับ</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal('new')}>
            <FontAwesomeIcon icon={faPlus} /> เพิ่มทะเบียนทองใหม่
          </button>
        </div>
      ) : (
        computedGroups.map(group => (
          <div key={group.mainType} className="gl-type-section">

            {/* Editorial heading — type name as title, history button inline */}
            <div className="gl-type-heading">
              <span className="gl-type-heading-name">{group.mainType}</span>
              <span className="gl-type-heading-count">{group.logsCount} รายการ</span>
              <span className="gl-type-heading-summary">
                {group.groupQty} ชิ้น · {group.groupWeight.toFixed(2)} กรัม
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setWizardOpen(group.mainType)}
                disabled={auditLoading || group.rows.length === 0}
                title={`ตรวจนับสต็อก ${group.mainType}`}
              >
                <FontAwesomeIcon icon={faFilePen} />
                ตรวจนับ
              </button>
              <button
                className="btn btn-ghost btn-sm gl-history-btn"
                onClick={() => setHistoryType(group.mainType)}
                title={`ดูประวัติสต็อก ${group.mainType}`}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} />
                ประวัติ
              </button>
            </div>

            <div className="card">
              <div className="table-wrap">
                <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>รายการ</th>
                      <th style={{ width: 110 }}>น้ำหนัก (กรัม)</th>
                      <th style={{ width: 110 }}>ความบริสุทธิ์</th>
                      <th style={{ width: 360 }}>บันทึกล่าสุด</th>
                      <th style={{ width: 80 }}>คงเหลือ</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(row => (
                      <tr key={row.gold_item_id}>
                        <td className="gl-subtype">{group.mainType} {row.subtype}</td>
                        <td className="gl-unit-weight">
                          {row.weight > 0 ? row.weight.toFixed(2) : '—'}
                        </td>
                        <td className="gl-purity">
                          {row.purity !== '—' ? row.purity + '%' : '—'}
                        </td>
                        <td className="gl-history">
                          <HistoryMiniChart history={row.history} />
                        </td>
                        <td className="gl-amount">
                          {row.amtStr || '0'}
                        </td>
                        <td className="gl-row-actions" onClick={e => e.stopPropagation()}>
                          {row.catalogItem && (
                            <>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => setModal(row.catalogItem)}
                              >
                                แก้ไข
                              </button>
                              <button
                                className="btn btn-danger-ghost btn-xs"
                                onClick={() => setConfirmDelete(row.catalogItem)}
                              >
                                ลบ
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ))
      )}

      {/* ── History Overlay ──────────────────────────────────────── */}
      {historyType && (
        <GoldStockHistory
          typeName={historyType}
          items={items.filter(i => i.type === historyType)}
          allStockLogs={allStockLogs}
          onClose={() => setHistoryType(null)}
        />
      )}

      {/* ── Wizard ───────────────────────────────────────────────── */}
      {wizardOpen && (
        <GoldStockWizard
          items={wizardOpen === true ? items : items.filter(i => i.type === wizardOpen)}
          editedAmounts={editedAmounts}
          onClose={() => setWizardOpen(null)}
          onSaved={(newAmounts) => {
            setEditedAmounts(prev => ({ ...prev, ...newAmounts }))
            setWizardOpen(null)
            loadAllStockLogs()
          }}
        />
      )}

      {/* ── Form Modal ───────────────────────────────────────────── */}
      {modal !== null && (
        <GoldStockForm
          item={modal === 'new' ? null : modal}
          onSaved={async () => {
            setModal(null)
            await Promise.all([loadCatalog(), loadAllStockLogs()])
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
