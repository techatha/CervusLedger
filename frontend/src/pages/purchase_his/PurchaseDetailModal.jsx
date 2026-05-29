import { useState } from 'react'
import { toBE, formatBaht } from '@/utils/thai.js'
import { useNavigate } from 'react-router-dom'
import { UpdateNotes } from 'wailsjs/go/handlers/PurchaseHandler.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import './PurchaseDetailModal.css'

export default function PurchaseDetailModal({ item, onClose, onUpdate }) {
  const navigate = useNavigate()

  const [isEditing, setIsEditing] = useState(false)
  const [editedNotes, setEditedNotes] = useState(item.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await UpdateNotes(item.id, editedNotes)
      if (onUpdate) {
        onUpdate({ ...item, notes: editedNotes })
      }
      setIsEditing(false)
    } catch (err) {
      alert('ไม่สามารถบันทึกหมายเหตุได้: ' + err)
    } finally {
      setSaving(false)
    }
  }

  const handleCustomerClick = (e) => {
    e.preventDefault()
    if (item.customer_id > 0) {
      onClose()
      navigate(`/customers/${item.customer_id}`)
    }
  }

  const weightG = item.weight_grams != null && item.weight_grams > 0
    ? item.weight_grams
    : (item.weight_baht || 0) * 15.244

  const weightB = item.weight_baht != null && item.weight_baht > 0
    ? item.weight_baht
    : (item.weight_grams || 0) / 15.244

  const fmtW = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pdm-modal" onClick={e => e.stopPropagation()}>

        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="modal-header">
          <div className="modal-title">รายละเอียดการรับซื้อทอง</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body pdm-body">

          {/* ─── Weight stat cards ───────────────────────────── */}
          <div className="pdm-weight-row">
            <div className="pdm-weight-card">
              <span className="pdm-hero-label">น้ำหนักทอง</span>
              <span className="pdm-hero-amount">{fmtW(weightG)} กรัม</span>
            </div>

            <div className="pdm-weight-divider" />

            <div className="pdm-weight-card">
              <div className="pdm-hero-label">ยอดจ่ายรับซื้อ</div>
              <div className="pdm-hero-amount">{formatBaht(item.total_amount)}</div>
              <div className="pdm-hero-label">วันที่ทำรายการ {toBE(item.date)}</div>

            </div>
          </div>

          {/* ─── Detail rows ─────────────────────────────────── */}
          <div className="pdm-rows">

            <DetailRow label="ลูกค้า">
              {item.customer_id > 0 ? (
                <a
                  href={`/customers/${item.customer_id}`}
                  onClick={handleCustomerClick}
                  className="pdm-link"
                >
                  {item.customer_name || 'ดูโปรไฟล์ลูกค้า'}
                </a>
              ) : (
                <span className="pdm-val">{item.customer_name || 'ลูกค้าทั่วไป'}</span>
              )}
            </DetailRow>

            <DetailRow label="ประเภททอง">
              <span className="pdm-val">{item.type || item.item_type || '—'}</span>
            </DetailRow>

            <DetailRow label="รุ่น / ขนาด">
              <span className="pdm-val pdm-val-secondary">{item.subtype || item.item_subtype || '—'}</span>
            </DetailRow>

            <DetailRow label="การเข้าคลังสินค้า">
              {item.is_inventory === 1
                ? <span className="badge badge-blue">นำเข้าคลังสินค้าแล้ว</span>
                : <span className="badge badge-muted">ยังไม่เข้าคลัง</span>
              }
            </DetailRow>

            <DetailRow label="สถานะปัจจุบัน" last>
              {item.still_exists === 1
                ? <span className="badge badge-green">มีของในร้าน</span>
                : <span className="badge badge-muted">ขาย / ละลายทองแล้ว</span>
              }
            </DetailRow>

          </div>

          {/* ─── Notes ───────────────────────────────────────── */}
          <div className="pdm-notes-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="pdm-notes-label">หมายเหตุ</span>
              {!isEditing && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setEditedNotes(item.notes || '')
                    setIsEditing(true)
                  }}
                  style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', minHeight: '0' }}
                >
                  <FontAwesomeIcon icon={faPenToSquare} /> แก้ไข
                </button>
              )}
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  className="input"
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    width: '100%',
                    minHeight: '60px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)'
                  }}
                  value={editedNotes}
                  onChange={e => setEditedNotes(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px 10px' }}
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ padding: '4px 10px' }}
                    onClick={handleSaveNotes}
                    disabled={saving}
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="pdm-notes-body"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setEditedNotes(item.notes || '')
                  setIsEditing(true)
                }}
              >
                {item.notes ? (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</span>
                ) : (
                  <span className="pdm-notes-empty">ไม่มีหมายเหตุเพิ่มเติม (คลิกเพื่อแก้ไข)</span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* ─── Footer ──────────────────────────────────────────── */}
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ minWidth: 100 }}>
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

    </div>
  )
}

/* ─── Helper ──────────────────────────────────────────────────────── */
function DetailRow({ label, children, last }) {
  return (
    <div className={`pdm-row${last ? ' pdm-row-last' : ''}`}>
      <span className="pdm-row-label">{label}</span>
      {children}
    </div>
  )
}