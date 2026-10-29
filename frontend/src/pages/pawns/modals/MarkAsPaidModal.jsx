import { useState } from 'react'
import { formatTicket } from '@/utils/thai'
import { thaiMonthShort } from '@/utils/pawn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle, faCheck } from '@fortawesome/free-solid-svg-icons'

export default function MarkAsPaidModal({ pawn, items, onConfirm, onClose }) {
  const [saving, setSaving] = useState(false)

  if (!items || items.length === 0) return null

  const formatMonths = () => {
    if (items.length > 2) {
      const first = items[0]
      const last = items[items.length - 1]
      return `${thaiMonthShort(first.month)} ${first.year + 543} ถึง ${thaiMonthShort(last.month)} ${last.year + 543} (${items.length} งวด)`
    }
    return items.map(m => `${thaiMonthShort(m.month)} ${m.year + 543}`).join(', ')
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onConfirm()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal={true} aria-labelledby="modal-title" tabIndex={-1} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-header">
          <div className="modal-title">ยืนยันทำรายการว่าชำระแล้ว</div>
          <button className="modal-close" onClick={onClose} disabled={saving}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Ticket Info */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>หมายเลขตั๋วจำนำ</span>
            <span style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--gold)',
              fontFamily: 'var(--font-display, monospace)',
              letterSpacing: '0.04em'
            }}>
              #{formatTicket(pawn.ticket_number)}
            </span>
            {(pawn.customer_name_display || pawn.customer_name) && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {pawn.customer_name_display || pawn.customer_name}
              </span>
            )}
          </div>

          {/* Details Card */}
          <div style={{
            background: 'var(--bg-base)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            fontSize: 13.5,
            lineHeight: 1.6,
            border: '1px solid var(--border)'
          }}>
            <div><strong>งวดที่ทำรายการ:</strong> <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{formatMonths()}</span></div>
          </div>

          {/* Notice Box */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            color: 'var(--blue)',
            fontSize: 12.5,
            lineHeight: 1.5
          }}>
            <FontAwesomeIcon icon={faInfoCircle} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              <strong>หมายเหตุ:</strong> การดำเนินการนี้จะบันทึกสถานะงวดดอกเบี้ยว่าชำระแล้วเท่านั้น <u>โดยไม่มีการบันทึกรายรับ/รายจ่าย</u> ในระบบ
            </span>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={saving}
          >
            <FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />
            {saving ? 'กำลังบันทึก...' : 'ยืนยันทำรายการ'}
          </button>
        </div>
      </div>
    </div>
  )
}
