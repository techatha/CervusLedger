import { formatTicket } from '@/utils/thai'

export default function ForfeitModal({ pawn, onConfirm, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">ยืนยันการขาดจำนำ</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'center' }}>
            ลูกค้าหมดสิทธิ์ไถ่ถอนแล้ว และต้องการเปลี่ยนสถานะเป็นขาดจำนำหรือไม่?
          </p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button
            className="btn"
            style={{ background: 'var(--red)', color: '#fff', border: 'none', minWidth: 90 }}
            onClick={onConfirm}
          >
            ยืนยันขาดจำนำ
          </button>
        </div>
      </div>
    </div>
  )
}
