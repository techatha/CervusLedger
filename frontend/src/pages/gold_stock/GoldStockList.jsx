import { useState, useEffect, useCallback } from 'react'
import {
  ListGoldItemsWithStock,
  DeleteGoldItem,
  ExportGoldStock,
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

  // Main types toggle state for excel export — keyed by mainType (default: true)
  const [exportToggleState, setExportToggleState] = useState({})

  // History overlay state — which type is open
  const [historyType, setHistoryType] = useState(null) // null = closed, string = type name

  const handleToggleExport = (mainType) => {
    setExportToggleState(prev => ({
      ...prev,
      [mainType]: prev[mainType] === false ? true : false
    }))
  }

  // ── Load all data (catalog + stock) in one call ─────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ListGoldItemsWithStock()
      setItems(data || [])
    } catch (e) {
      setError('โหลดข้อมูลสต็อกไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Mount ───────────────────────────────────────────────────────────────────
  useEffect(() => { void loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await DeleteGoldItem(confirmDelete.id)
      setConfirmDelete(null)
      await loadData()
    } catch (e) {
      setError(String(e))
      setConfirmDelete(null)
    }
  }

  const handleExport = async () => {
    try {
      setError(null)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')

      const startDate = `${year}-01-01`
      const endDate = `${year}-${month}-${day}`

      const excludedTypes = typeKeys.filter(t => exportToggleState[t] === false)
      if (typeKeys.length > 0 && excludedTypes.length === typeKeys.length) {
        setError('กรุณาเปิดส่งออกอย่างน้อย 1 ประเภท')
        return
      }

      setExporting(true)
      await ExportGoldStock(startDate, endDate, excludedTypes)
    } catch (e) {
      if (e) setError('ส่งออก Excel ไม่สำเร็จ: ' + String(e))
    } finally {
      setExporting(false)
    }
  }

  // ── Grouping & computation ──────────────────────────────────────────────────
  const auditGroups = groupBy(items, 'type')
  const typeKeys = Object.keys(auditGroups)

  const computedGroups = typeKeys.map(mainType => {
    const groupItems = auditGroups[mainType]

    const groupQty = groupItems.reduce((s, item) => s + (item.latest_amount || 0), 0)
    const groupWeight = groupItems.reduce((s, item) => {
      return s + ((item.weight_grams || 0) * (item.latest_amount || 0))
    }, 0)

    const rows = groupItems.map((item, index) => {
      return {
        gold_item_id: item.id,
        index: index + 1,
        subtype: item.subtype,
        weight: item.weight_grams || 0,
        purity: item.purity || '—',
        no_purity: item.no_purity || 0,
        no_weight: item.no_weight || 0,
        amtStr: String(item.latest_amount || 0),
        history: item.recent_history || [],
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
            disabled={loading || items.length === 0}
          >
            <FontAwesomeIcon icon={faFilePen} />
            เริ่มตรวจนับสต็อก
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Per-Type Sections ────────────────────────────────────── */}
      {loading ? (
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
        computedGroups.map(group => {
          const isExportEnabled = exportToggleState[group.mainType] !== false
          return (
            <div key={group.mainType} className="gl-type-section">

              {/* Editorial heading — type name as title, history button inline */}
              <div className="gl-type-heading">
                <span className="gl-type-heading-name">{group.mainType}</span>
                <span className="gl-type-heading-count">{group.logsCount} รายการ</span>
                <span className="gl-type-heading-summary">
                  {group.groupQty} ชิ้น · {group.groupWeight.toFixed(2)} กรัม
                </span>
                <label
                  className={`gl-type-export-toggle ${!isExportEnabled ? 'is-disabled' : ''}`}
                  title={isExportEnabled ? 'รวมประเภทนี้ในการส่งออก Excel' : 'ไม่ส่งออกประเภทนี้ไปยัง Excel'}
                >
                  <span className="gl-toggle-label">
                    {isExportEnabled ? 'ส่งออก Excel' : 'ไม่ส่งออก'}
                  </span>
                  <span className="gl-toggle-switch">
                    <input
                      type="checkbox"
                      checked={isExportEnabled}
                      onChange={() => handleToggleExport(group.mainType)}
                    />
                    <span className="gl-toggle-slider" />
                  </span>
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setWizardOpen(group.mainType)}
                  disabled={loading || group.rows.length === 0}
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
                <table className="table">
                  <thead>
                    <tr>
                      <th className="col-200">รายการ</th>
                      <th className="col-120">น้ำหนัก (กรัม)</th>
                      <th className="col-120">ความบริสุทธิ์</th>
                      <th className="col-300">บันทึกล่าสุด</th>
                      <th className="col-100" style={{ textAlign: 'right' }}>คงเหลือ</th>
                      <th className="col-120"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(row => (
                      <tr key={row.gold_item_id}>
                        <td className="gl-subtype">{group.mainType} {row.subtype}</td>
                        <td className="gl-unit-weight">
                          {row.no_weight ? (
                            <span className="gl-no-pw-badge">ไม่มีนำหนักที่แน่นอน</span>
                          ) : (
                            row.weight > 0 ? row.weight.toFixed(2) : '—'
                          )}
                        </td>
                        <td className="gl-purity">
                          {row.no_purity ? (
                            <span className="gl-no-pw-badge">ไม่ระบุความบริสุธท์</span>
                          ) : (
                            row.purity !== '—' ? row.purity + '%' : '—'
                          )}
                        </td>
                        <td className="gl-history">
                          <HistoryMiniChart history={row.history} />
                        </td>
                        <td className="gl-amount" style={{ textAlign: 'right' }}>
                          {row.amtStr || '0'}
                        </td>
                        <td className="gl-row-actions col-120" onClick={e => e.stopPropagation()}>
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
        )
      })
      )}

      {/* ── History Overlay ──────────────────────────────────────── */}
      {historyType && (
        <GoldStockHistory
          typeName={historyType}
          items={items.filter(i => i.type === historyType)}
          onClose={() => setHistoryType(null)}
        />
      )}

      {/* ── Wizard ───────────────────────────────────────────────── */}
      {wizardOpen && (
        <GoldStockWizard
          items={wizardOpen === true ? items : items.filter(i => i.type === wizardOpen)}
          onClose={() => setWizardOpen(null)}
          onSaved={() => {
            setWizardOpen(null)
            void loadData()
          }}
        />
      )}

      {/* ── Form Modal ───────────────────────────────────────────── */}
      {modal !== null && (
        <GoldStockForm
          item={modal === 'new' ? null : modal}
          onSaved={async () => {
            setModal(null)
            await loadData()
          }}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Confirm Delete ───────────────────────────────────────── */}
      {confirmDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" tabIndex={-1} onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null) }} onKeyDown={(e) => { if (e.key === 'Escape') setConfirmDelete(null) }}>
          <div className="modal" style={{ width: 400 }}>
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
