import { useState } from 'react'
import { toBE, formatBaht } from '@/utils/thai.js'
import { useNavigate } from 'react-router-dom'
import { UpdateNotes, ToggleIsInventory, ToggleStillExists } from 'wailsjs/go/handlers/PurchaseHandler.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import './PurchaseDetailModal.css'

export default function PurchaseDetailModal({ item, onClose, onUpdate }) {
  const navigate = useNavigate()

  const [isEditing,   setIsEditing]   = useState(false)
  const [editedNotes, setEditedNotes] = useState(item.notes || '')
  const [saving,      setSaving]      = useState(false)

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

  const handleInventoryToggle = async (e) => {
    const val = e.target.checked ? 1 : 0
    try {
      await ToggleIsInventory(item.id, val)
      onUpdate?.({ ...item, is_inventory: val })
    } catch (err) {
      alert('ไม่สามารถอัปเดตสถานะคลังสินค้าได้: ' + err)
    }
  }

  const handleStillExistsToggle = async (e) => {
    const val = e.target.checked ? 1 : 0
    try {
      await ToggleStillExists(item.id, val)
      onUpdate?.({ ...item, still_exists: val })
    } catch (err) {
      alert('ไม่สามารถเปลี่ยนสถานะสินค้าได้: ' + err)
    }
  }

  const handleCustomerClick = (e) => {
    e.preventDefault()
    if (item.customer_id > 0) { onClose(); navigate(`/customers/${item.customer_id}`) }
  }

  const weightG = item.weight_grams > 0
    ? item.weight_grams
    : (item.weight_baht || 0) * 15.244
  const weightB = item.weight_baht > 0
    ? item.weight_baht
    : (item.weight_grams || 0) / 15.244
  const fmtW = n => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pdm-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title">รายละเอียดการรับซื้อทอง</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body pdm-body">
          {/* Item header */}
          <div className="pdm-item-header">
            <span className="pdm-item-title">
              {item.type || item.item_type || '—'} {item.subtype || item.item_subtype || '—'}
            </span>
          </div>

          {/* ─── Weight stat cards ───────────────────────────── */}
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

          {/* ─── Detail rows ──────────────────────────────────── */}
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
              <span className="pdm-val pdm-val-secondary">{item.subtype || item.item_subtype || '—'}</span>
            </div>

            {/* สถานะปัจจุบัน toggle row */}
            <label className={`pdm-row pdm-inventory-row ${item.still_exists === 1 ? 'pdm-inventory-row--on' : ''} ${item.is_inventory === 1 ? 'pdm-row-disabled' : ''}`}>
              <div className="pdm-inventory-left">
                <input
                  type="checkbox"
                  checked={item.still_exists === 1}
                  onChange={handleStillExistsToggle}
                  disabled={item.is_inventory === 1}
                  style={{ accentColor: 'var(--green)', transform: 'scale(1.2)', cursor: item.is_inventory === 1 ? 'not-allowed' : 'pointer' }}
                />
                <div>
                  <div className={`pdm-inventory-title ${item.still_exists === 1 ? 'pdm-inventory-title--on' : ''}`}>
                    มีของในร้าน
                  </div>
                  <div className="pdm-inventory-desc">เปิดหากสินค้ายังอยู่ หรือปิดเพื่อบันทึกว่าขาย/ละลายแล้ว</div>
                </div>
              </div>
              {item.still_exists === 1
                ? <span className="badge badge-green">มีของในร้าน</span>
                : <span className="badge badge-muted">ขาย/ละลายแล้ว</span>
              }
            </label>

            {/* Inventory toggle row */}
            <label className={`pdm-row pdm-inventory-row ${item.is_inventory === 1 ? 'pdm-inventory-row--on' : ''} ${item.still_exists === 0 ? 'pdm-row-disabled' : ''}`}>
              <div className="pdm-inventory-left">
                <input
                  type="checkbox"
                  checked={item.is_inventory === 1}
                  onChange={handleInventoryToggle}
                  disabled={item.still_exists === 0}
                  style={{ accentColor: 'var(--green)', transform: 'scale(1.2)', cursor: item.still_exists === 0 ? 'not-allowed' : 'pointer' }}
                />
                <div>
                  <div className={`pdm-inventory-title ${item.is_inventory === 1 ? 'pdm-inventory-title--on' : ''}`}>
                    นำเข้าคลังสินค้าหลัก
                  </div>
                  <div className="pdm-inventory-desc">บันทึกในคลังสำหรับนับสต็อกประจำเดือน</div>
                </div>
              </div>
              {item.is_inventory === 1
                ? <span className="badge badge-blue">นำเข้าคลังแล้ว</span>
                : <span className="badge badge-muted">ยังไม่เข้าคลัง</span>
              }
            </label>

          </div>

          {/* ─── Notes ────────────────────────────────────────── */}
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
  )
}