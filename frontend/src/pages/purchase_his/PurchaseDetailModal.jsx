import { useState } from 'react'
import { toBE, formatBaht } from '@/utils/thai.js'
import { useNavigate } from 'react-router-dom'
import { UpdateNotes, ToggleStillExists, CastToInventory } from 'wailsjs/go/purchase_handler/PurchaseHandler.js'
import GoldTypeSelectSection from '@/components/GoldTypeSelectSection.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faCheck, faXmark, faBoxArchive, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import './PurchaseDetailModal.css'

export default function PurchaseDetailModal({ item, onClose, onUpdate }) {
  const navigate = useNavigate()

  const [isEditing, setIsEditing]       = useState(false)
  const [editedNotes, setEditedNotes]   = useState(item.notes || '')
  const [saving, setSaving]             = useState(false)

  // Confirm dialog state for the irreversible "add to stock" action
  const [showInventoryConfirm, setShowInventoryConfirm] = useState(false)
  const [confirmingInventory, setConfirmingInventory]   = useState(false)

  const [selectedGoldItemId, setSelectedGoldItemId] = useState(0)
  const [selectedGoldItemLabel, setSelectedGoldItemLabel] = useState('')

  // ── Notes ─────────────────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await UpdateNotes(item.id, editedNotes)
      onUpdate?.({ ...item, notes: editedNotes })
      setIsEditing(false)
    } catch (err) {
      alert('ไม่สามารถบันทึกหมายเหตุได้: ' + err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelNotes = () => {
    setEditedNotes(item.notes || '')
    setIsEditing(false)
  }

  // ── still_exists toggle (reversible) ──────────────────────────────────────
  const handleStillExistsToggle = async (e) => {
    const val = e.target.checked ? 1 : 0
    try {
      await ToggleStillExists(item.id, val)
      onUpdate?.({ ...item, still_exists: val })
    } catch (err) {
      alert('ไม่สามารถเปลี่ยนสถานะสินค้าได้: ' + err)
    }
  }

  // ── is_inventory: show confirm dialog first ────────────────────────────────
  // This checkbox is PERMANENT once checked. The backend (GoldItemHandler or
  // PurchaseHandler) should, upon ToggleIsInventory(id, 1):
  //   1. Set purchase.is_inventory = 1 on the purchase record.
  //   2. Upsert a matching GoldItem entry (type + subtype derived from the
  //      purchase) into the gold_items catalog so it appears in GoldStockList.
  //   3. Create an initial stock log (RecordStockLog) with amount = 1 for
  //      today's date, so the item immediately appears in the wizard count.
  // Once is_inventory = 1, this checkbox must be disabled and can never be
  // unchecked — the item is now tracked in the stock system.
  const handleInventoryCheckboxClick = () => {
    if (item.is_inventory === 1) return // already locked — do nothing
    setShowInventoryConfirm(true)
  }

  const handleInventoryConfirm = async () => {
    if (!selectedGoldItemId) return
    setConfirmingInventory(true)
    try {
      await CastToInventory(item.id, selectedGoldItemId)
      onUpdate?.({ ...item, is_inventory: 1 })
      setShowInventoryConfirm(false)
    } catch (err) {
      alert('ไม่สามารถอัปเดตสถานะคลังสินค้าได้: ' + err)
    } finally {
      setConfirmingInventory(false)
    }
  }

  const handleInventoryConfirmCancel = () => {
    setSelectedGoldItemId(0)
    setSelectedGoldItemLabel('')
    setShowInventoryConfirm(false)
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleCustomerClick = (e) => {
    e.preventDefault()
    if (item.customer_id > 0) { onClose(); navigate(`/customers/${item.customer_id}`) }
  }

  // ── Weight helpers ─────────────────────────────────────────────────────────
  const weightG = item.weight_grams > 0
    ? item.weight_grams
    : (item.weight_baht || 0) * 15.244
  const weightB = item.weight_baht > 0
    ? item.weight_baht
    : (item.weight_grams || 0) / 15.244
  const fmtW = n => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  // Whether the inventory checkbox is permanently locked
  const inventoryLocked = item.is_inventory === 1

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal pdm-modal" onClick={e => e.stopPropagation()}>

          <div className="modal-header">
            <div className="modal-title">รายละเอียดการรับซื้อทอง</div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-body pdm-body">

            {/* Item header */}
            <div className="pdm-item-header">
              <span className="pdm-item-title">{item.type || item.item_type || '—'}</span>
            </div>

            {/* ─── Weight stat cards ──────────────────────────────── */}
            <div className="pdm-weight-row">
              <div className="pdm-weight-card">
                <span className="pdm-weight-label">ยอดจ่ายรับซื้อ</span>
                <span className="pdm-weight-val pdm-weight-val-amber">{formatBaht(item.total_amount)}</span>
                <span className="pdm-weight-unit">วันที่ทำรายการ {toBE(item.date)}</span>
              </div>
              <div className="pdm-weight-divider" />
              <div className="pdm-weight-card">
                <span className="pdm-weight-label">น้ำหนักทอง</span>
                <span className="pdm-weight-val">{fmtW(weightG)} กรัม</span>
                <span className="pdm-weight-unit">( {fmtW(weightB)} บาททอง )</span>
              </div>
            </div>

            {/* ─── Detail rows ────────────────────────────────────── */}
            <div className="pdm-rows">

              <div className="pdm-row">
                <span className="pdm-row-label">ลูกค้า</span>
                {item.customer_id > 0 ? (
                  <a href={`/customers/${item.customer_id}`} onClick={handleCustomerClick} className="pdm-link">
                    {item.customer_name || 'ดูโปรไฟล์ลูกค้า'}
                  </a>
                ) : (
                  <span className="pdm-val">{item.customer_name || 'ลูกค้าทั่วไป'}</span>
                )}
              </div>

              <div className="pdm-row">
                <span className="pdm-row-label">ประเภททอง</span>
                <span className="pdm-val">{item.type || item.item_type || '—'}</span>
              </div>

              <div className="pdm-row">
                <span className="pdm-row-label">รุ่น / ขนาด</span>
              </div>

              {/* still_exists — reversible toggle */}
              <label className={`pdm-row pdm-inventory-row ${item.still_exists === 1 ? 'pdm-inventory-row--on' : ''} ${inventoryLocked ? 'pdm-row-disabled' : ''}`}>
                <div className="pdm-inventory-left">
                  <input
                    type="checkbox"
                    checked={item.still_exists === 1}
                    onChange={handleStillExistsToggle}
                    disabled={inventoryLocked}
                    style={{
                      accentColor: 'var(--green)',
                      transform: 'scale(1.2)',
                      cursor: inventoryLocked ? 'not-allowed' : 'pointer',
                    }}
                  />
                  <div>
                    <div className={`pdm-inventory-title ${item.still_exists === 1 ? 'pdm-inventory-title--on' : ''}`}>
                      มีของในร้าน
                    </div>
                    <div className="pdm-inventory-desc">
                      เปิดหากสินค้ายังอยู่ หรือปิดเพื่อบันทึกว่าขาย / ละลายแล้ว
                    </div>
                  </div>
                </div>
                {item.still_exists === 1
                  ? <span className="badge badge-green">มีของในร้าน</span>
                  : <span className="badge badge-muted">ขาย / ละลายแล้ว</span>
                }
              </label>

              {/* is_inventory — PERMANENT once enabled */}
              <div
                className={`pdm-row pdm-inventory-row ${inventoryLocked ? 'pdm-inventory-row--on pdm-inventory-row--locked' : ''} ${item.still_exists === 0 ? 'pdm-row-disabled' : ''}`}
                onClick={!inventoryLocked && item.still_exists !== 0 ? handleInventoryCheckboxClick : undefined}
                style={{ cursor: inventoryLocked ? 'default' : item.still_exists === 0 ? 'not-allowed' : 'pointer' }}
              >
                <div className="pdm-inventory-left">
                  {/* Rendered as a plain visual — click is handled on the row div above */}
                  <input
                    type="checkbox"
                    checked={inventoryLocked}
                    readOnly
                    disabled={inventoryLocked || item.still_exists === 0}
                    onClick={e => {
                      e.preventDefault()
                      if (!inventoryLocked && item.still_exists !== 0) handleInventoryCheckboxClick()
                    }}
                    style={{
                      accentColor: 'var(--green)',
                      transform: 'scale(1.2)',
                      cursor: inventoryLocked ? 'default' : item.still_exists === 0 ? 'not-allowed' : 'pointer',
                      pointerEvents: 'auto',
                    }}
                  />
                  <div>
                    <div className={`pdm-inventory-title ${inventoryLocked ? 'pdm-inventory-title--on' : ''}`}>
                      นำเข้าคลังสินค้าหลัก
                      {inventoryLocked && (
                        <span className="pdm-locked-badge">
                          <FontAwesomeIcon icon={faBoxArchive} /> บันทึกแล้ว
                        </span>
                      )}
                    </div>
                    <div className="pdm-inventory-desc">
                      {inventoryLocked
                        ? 'สินค้านี้อยู่ในระบบคลังแล้ว — ไม่สามารถยกเลิกได้'
                        : 'บันทึกในคลังสำหรับนับสต็อกประจำเดือน (ดำเนินการไม่สามารถยกเลิกได้)'
                      }
                    </div>
                  </div>
                </div>
                {inventoryLocked
                  ? <span className="badge badge-blue">นำเข้าคลังแล้ว</span>
                  : <span className="badge badge-muted">ยังไม่เข้าคลัง</span>
                }
              </div>

            </div>

            {/* ─── Notes ──────────────────────────────────────────── */}
            <div className="pdm-notes-block">
              <div className="pdm-notes-header">
                <span className="pdm-notes-label">หมายเหตุ</span>
                {!isEditing && (
                  <button className="btn btn-ghost btn-xs" onClick={() => { setEditedNotes(item.notes || ''); setIsEditing(true) }}>
                    <FontAwesomeIcon icon={faPenToSquare} /> แก้ไข
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="pdm-notes-edit">
                  <textarea
                    className="input pdm-notes-textarea"
                    value={editedNotes}
                    onChange={e => setEditedNotes(e.target.value)}
                    disabled={saving}
                    autoFocus
                    placeholder="พิมพ์หมายเหตุ..."
                  />
                  <div className="pdm-notes-actions">
                    <button className="btn btn-ghost btn-sm" onClick={handleCancelNotes} disabled={saving}>
                      <FontAwesomeIcon icon={faXmark} /> ยกเลิก
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveNotes} disabled={saving}>
                      <FontAwesomeIcon icon={faCheck} />
                      {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pdm-notes-body" onClick={() => { setEditedNotes(item.notes || ''); setIsEditing(true) }}>
                  {item.notes
                    ? <span style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</span>
                    : <span className="pdm-notes-empty">ไม่มีหมายเหตุ — คลิกเพื่อเพิ่ม</span>
                  }
                </div>
              )}
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ minWidth: 100 }}>
              ปิดหน้าต่าง
            </button>
          </div>

        </div>
      </div>

      {/* ── Inventory confirm dialog ───────────────────────────────────────── */}
      {showInventoryConfirm && (
        <div className="modal-backdrop pdm-confirm-backdrop" onClick={handleInventoryConfirmCancel}>
          <div className="modal pdm-confirm-modal" onClick={e => e.stopPropagation()}>

            <div className="pdm-confirm-icon-wrap">
              <FontAwesomeIcon icon={faTriangleExclamation} className="pdm-confirm-icon" />
              <div className="pdm-confirm-title">นำเข้าคลังสินค้าหลัก?</div>
            </div>

            <div className="pdm-confirm-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              <GoldTypeSelectSection
                goldItemId={selectedGoldItemId}
                onChange={(change) => {
                  if (change.gold_item_id !== undefined) setSelectedGoldItemId(change.gold_item_id)
                  if (change.gold_item_label !== undefined) setSelectedGoldItemLabel(change.gold_item_label)
                }}
                hideWeightAndPurity={true}
              />

              <div style={{ marginTop: 8, fontSize: '13px' }}>
                <p style={{ marginBottom: 6 }}>เมื่อยืนยันแล้ว ระบบจะ:</p>
                <ul className="pdm-confirm-list">
                  <li>สมทบเข้ากับรายการ <strong>{selectedGoldItemLabel || '—'}</strong></li>
                  <li>บันทึกจำนวนสต็อกเพิ่มขึ้น 1 ชิ้น ณ วันนี้</li>
                  <li>การดำเนินการนี้<strong style={{ color: 'var(--red, #e74c3c)' }}>ไม่สามารถยกเลิกได้</strong></li>
                </ul>
              </div>
            </div>

            <div className="pdm-confirm-footer">
              <button
                className="btn btn-ghost"
                onClick={handleInventoryConfirmCancel}
                disabled={confirmingInventory}
              >
                <FontAwesomeIcon icon={faXmark} /> ยกเลิก
              </button>
              <button
                className="btn pdm-confirm-btn-ok"
                onClick={handleInventoryConfirm}
                disabled={confirmingInventory || !selectedGoldItemId}
              >
                <FontAwesomeIcon icon={faBoxArchive} />
                {confirmingInventory ? 'กำลังบันทึก...' : 'ยืนยัน นำเข้าคลัง'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}