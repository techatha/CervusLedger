import { useState } from 'react'
import { formatTicket } from '@/utils/thai'
import { thaiMonthShort, getLatestPaidMonth } from '@/utils/pawn'

export default function RedeemModal({ pawn, payments, pendingMonths, onConfirm, onClose }) {
  const [includeExtraMonth, setIncludeExtraMonth] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pawnDate = new Date(pawn.pawned_date)
  pawnDate.setHours(0, 0, 0, 0)
  const dueDay = pawnDate.getDate()

  const latest = getLatestPaidMonth(pawn, payments)
  
  let checkMonth = latest ? latest.month + 1 : 0
  let checkYear = latest ? latest.year : new Date().getFullYear()

  for (let i = 0; i < pendingMonths.length; i++) {
    if (checkMonth > 11) {
      checkMonth = 0
      checkYear++
    }
    checkMonth++
  }
  if (checkMonth > 11) {
    checkMonth = 0
    checkYear++
  }

  const maxDaysInCheckMonth = new Date(checkYear, checkMonth + 1, 0).getDate()
  const actualDueDay = Math.min(dueDay, maxDaysInCheckMonth)
  const nextDueDate = new Date(checkYear, checkMonth, actualDueDay)
  nextDueDate.setHours(0, 0, 0, 0)

  const diffTime = nextDueDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const nextMonthLabel = `${thaiMonthShort(checkMonth)} ${checkYear + 543}`
  const nextDueDateStr = `${actualDueDay} ${thaiMonthShort(checkMonth)} ${checkYear + 543}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">ยืนยันการไถ่ถอน</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Ticket Number Header */}
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

          {/* Info Card */}
          <div style={{
            background: 'var(--bg-hover)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)'
          }}>
            <div><strong>วันครบกำหนดชำระงวดถัดไป:</strong> {nextDueDateStr}</div>
            <div>
              <strong>จำนวนวันที่เหลือ:</strong>{' '}
              <span style={{ color: diffDays <= 7 ? 'var(--red)' : 'var(--blue)', fontWeight: 700 }}>
                {diffDays > 0 ? `เหลืออีก ${diffDays} วัน` : diffDays === 0 ? 'ถึงกำหนดชำระวันนี้' : `เกินกำหนดชำระ ${Math.abs(diffDays)} วัน`}
              </span>
            </div>
            {pendingMonths.length > 0 && (
              <div style={{ marginTop: 4, color: 'var(--red)', fontSize: 12, fontWeight: 500 }}>
                * มีดอกเบี้ยค้างชำระ {pendingMonths.length} งวด (รวมในรายการไถ่ถอนแล้ว)
              </div>
            )}
          </div>

          {/* Checkbox option */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '10px 14px',
            background: includeExtraMonth ? 'var(--blue-bg, #eff6ff)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            border: includeExtraMonth ? '1px solid var(--blue)' : '1px solid var(--border)',
            transition: 'all 0.15s ease'
          }}>
            <input
              type="checkbox"
              checked={includeExtraMonth}
              onChange={e => setIncludeExtraMonth(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--blue)' }}
            />
            <span style={{ fontSize: 13.5, fontWeight: includeExtraMonth ? 600 : 400, color: includeExtraMonth ? 'var(--blue)' : 'var(--text-primary)' }}>
              คิดดอกเบี้ยเพิ่ม 1 เดือน (งวด {nextMonthLabel})
            </span>
          </label>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button
            className="btn"
            style={{ background: 'var(--blue)', color: '#fff', border: 'none', minWidth: 100 }}
            onClick={() => onConfirm(includeExtraMonth)}
          >
            ยืนยันการไถ่ถอน
          </button>
        </div>
      </div>
    </div>
  )
}
