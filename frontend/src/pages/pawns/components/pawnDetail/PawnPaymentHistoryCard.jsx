import { toBE } from '@/utils/thai'
import { thaiMonthShort } from '@/utils/pawn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-solid-svg-icons'

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

export default function PawnPaymentHistoryCard({ payments, onDeletePayment }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">ประวัติการจ่ายดอกเบี้ย</span>
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
                <th width="40"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, index) => (
                <tr key={p.id} className="payment-history-row">
                  <td><IconCheckCircle /></td>
                  <td style={{ fontWeight: 500 }}>{thaiMonthShort(p.month)} {p.year}</td>
                  <td>{toBE(p.paid_date)}</td>
                  <td className="truncate-cell" style={{ color: 'var(--text-muted)', fontSize: 13 }} title={p.notes}>
                    {p.notes || '—'}
                  </td>
                  <td className="payment-actions-cell" style={{ textAlign: 'right', paddingRight: '12px' }}>
                    {index === payments.length - 1 && onDeletePayment && (
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
