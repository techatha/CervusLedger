import { toBE } from '@/utils/thai'
import { thaiMonthShort } from '@/utils/pawn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan, faXmark, faCheck, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { useMemo, useState } from 'react'

function IconCheckCircle() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      backgroundColor: '#22c55e', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

function IconCrossCircle() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      backgroundColor: 'var(--red)', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <FontAwesomeIcon icon={faXmark} style={{ color: '#fff', fontSize: 12 }} />
    </div>
  )
}

export default function PawnPaymentHistoryCard({ pawn, payments, onDeletePayment, onMarkAsPaid, isActive }) {
  const [expanded, setExpanded] = useState(false)

  // Build a timeline from pawn start to the last paid month
  const timeline = useMemo(() => {
    if (!payments || payments.length === 0 || !pawn || !pawn.pawned_date) return []

    // Find the latest paid month in the payments array
    let maxYear = 0
    let maxMonth = 0
    payments.forEach(p => {
      if (p.year > maxYear || (p.year === maxYear && p.month > maxMonth)) {
        maxYear = p.year
        maxMonth = p.month
      }
    })

    const pawnDate = new Date(pawn.pawned_date)
    let checkMonth = pawnDate.getMonth() + 1 // Start from the next month from pawn date
    let checkYear = pawnDate.getFullYear()

    const fullTimeline = []
    let hasReachedEnd = false

    while (!hasReachedEnd) {
      if (checkMonth > 11) { checkMonth = 0; checkYear++ }
      
      const m = checkMonth + 1 // 1-indexed

      // Look for a payment
      const payment = payments.find(p => p.month === m && p.year === checkYear)
      fullTimeline.push({
        month: m,
        year: checkYear,
        paid: !!payment,
        payment,
        id: payment ? payment.id : `gap-${checkYear}-${m}`
      })

      if (checkYear > maxYear || (checkYear === maxYear && m >= maxMonth)) {
        hasReachedEnd = true
      }

      checkMonth++
    }
    
    return fullTimeline
  }, [pawn, payments])

  const visibleTimeline = useMemo(() => {
    if (expanded || timeline.length <= 5) return timeline
    return timeline.slice(timeline.length - 5)
  }, [timeline, expanded])

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-title">ประวัติการจ่ายดอกเบี้ย</span>
        {timeline.length > 5 && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {expanded ? `ทั้งหมด ${timeline.length} รายการ` : `แสดง 5 จาก ${timeline.length} รายการ`}
          </span>
        )}
      </div>
      <div className="table-wrap">
        {!payments || payments.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
            ยังไม่มีประวัติการจ่ายดอกเบี้ย
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th width="40"></th>
                <th>งวดเดือน</th>
                <th>วันที่จ่าย</th>
                <th className="col-250">หมายเหตุ</th>
                <th width="140" style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {!expanded && timeline.length > 5 && (
                <tr
                  className="payment-history-more-row"
                  onClick={() => setExpanded(true)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-hover, rgba(0, 0, 0, 0.02))',
                    borderBottom: '1px dashed var(--border-color, #e5e7eb)',
                  }}
                  title="คลิกเพื่อดูประวัติก่อนหน้านี้ทั้งหมด"
                >
                  <td colSpan={5} style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, letterSpacing: '3px', marginRight: 8, color: 'var(--text-muted)' }}>...</span>
                    <span>(มีอีก {timeline.length - 5} รายการก่อนหน้านี้ — คลิกเพื่อดูทั้งหมด)</span>
                  </td>
                </tr>
              )}
              {visibleTimeline.map((item, index) => {
                if (item.paid) {
                  const p = item.payment
                  return (
                    <tr key={p.id} className="payment-history-row">
                      <td><IconCheckCircle /></td>
                      <td style={{ fontWeight: 500 }}>{thaiMonthShort(p.month)} {p.year + 543}</td>
                      <td>{toBE(p.paid_date)}</td>
                      <td className="truncate-cell" style={{ color: 'var(--text-muted)', fontSize: 13 }} title={p.notes}>
                        {p.notes || '—'}
                      </td>
                      <td className="payment-actions-cell" style={{ textAlign: 'right', paddingRight: '12px' }}>
                        {p.id === payments[payments.length - 1].id && onDeletePayment && isActive && (
                          <button
                            className="btn btn-danger-ghost btn-xs dv-delete-btn payment-delete-btn"
                            onClick={() => onDeletePayment(p.id)}
                            title="ลบข้อมูลการจ่ายดอกเบี้ยงวดล่าสุด"
                          >
                            <FontAwesomeIcon icon={faTrashCan} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                } else {
                  return (
                    <tr key={item.id} className="payment-history-row payment-history-gap" style={{ opacity: 0.85 }}>
                      <td><IconCrossCircle /></td>
                      <td style={{ fontWeight: 500 }}>{thaiMonthShort(item.month)} {item.year + 543}</td>
                      <td style={{ color: 'var(--red)', fontSize: 13, fontStyle: 'italic' }}>
                        ยังไม่ชำระ (เว้นว่าง)
                      </td>
                      <td></td>
                      <td className="payment-actions-cell" style={{ textAlign: 'right', paddingRight: '12px' }}>
                        {isActive && onMarkAsPaid && (
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => onMarkAsPaid(item)}
                            title="ทำรายการว่างวดนี้ชำระแล้ว (ไม่มีผลต่อรายรับ/รายจ่าย)"
                            style={{ fontSize: 12, padding: '2px 8px', color: 'var(--blue)', borderColor: 'var(--blue)', whiteSpace: 'nowrap' }}
                          >
                            <FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />
                            ทำรายการว่าชำระแล้ว
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                }
              })}
            </tbody>
          </table>
        )}
      </div>
      {timeline.length > 5 && (
        <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setExpanded(!expanded)}
            style={{ color: 'var(--text-secondary)', fontSize: 13 }}
          >
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} style={{ marginRight: 6 }} />
            {expanded ? 'ย่อเหลือ 5 รายการล่าสุด' : `แสดงประวัติทั้งหมด (${timeline.length} รายการ)`}
          </button>
        </div>
      )}
    </div>
  )
}

