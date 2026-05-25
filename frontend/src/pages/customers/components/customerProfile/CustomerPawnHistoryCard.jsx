import { useNavigate } from 'react-router-dom'
import { toBE, pawnStatusBadge, formatBaht, formatTicket } from '@/utils/thai'
import { getPendingMonths } from '@/utils/pawn'

export default function CustomerPawnHistoryCard({ pawns }) {
  const navigate = useNavigate()

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">ประวัติจำนำ</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ตั๋ว</th>
              <th>วันจำนำ</th>
              <th>รายการ</th>
              <th>น้ำหนัก</th>
              <th>ต้นเงิน</th>
              <th>ดอกเบี้ย/เดือน</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {pawns.length === 0 ? (
              <tr className="loading-row">
                <td colSpan={7}>ยังไม่มีประวัติการจำนำ</td>
              </tr>
            ) : (
              pawns.map(p => {
                const { label, cls } = pawnStatusBadge(p.status)
                const principal = p.current_principal ?? p.initial_principal
                return (
                  <tr key={p.id} className="cp-pawn-row" onClick={() => navigate(`/pawns/${p.id}`)}>
                    <td>
                      <span className="cp-ticket">{formatTicket(p.ticket_number)}</span>
                      {p.ticket_status !== 'active' && (
                        <span className="badge badge-amber" style={{ marginLeft: 4, fontSize: 10 }}>
                          {p.ticket_status === 'lost' ? 'ทำหาย' : 'ชำรุด'}
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{toBE(p.pawned_date)}</td>
                    <td>
                      <div className="cp-item-type">{p.item_type}</div>
                      {p.description && <div className="cp-description">{p.description}</div>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {p.weight_grams ? `${p.weight_grams} ก.` : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatBaht(principal)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatBaht(p.interest_amount)}
                      <span className="cp-rate">
                        ({p.monthly_interest_rate}%)
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <span className={`badge ${cls}`}>{label}</span>
                        {(() => {
                          const pending = getPendingMonths(p)
                          return pending.length > 0 ? (
                            <span className="badge badge-red" style={{ fontSize: 11, padding: '1px 6px' }}>
                              ค้าง {pending.length} เดือน
                            </span>
                          ) : null
                        })()}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
