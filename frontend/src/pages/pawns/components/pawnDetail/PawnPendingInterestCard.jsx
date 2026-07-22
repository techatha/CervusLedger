import { useState, useEffect } from 'react'
import { formatBaht } from '@/utils/thai'
import { thaiMonthShort } from '@/utils/pawn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartArrowDown, faCartPlus, faCheck } from '@fortawesome/free-solid-svg-icons'

function IconXCircle() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      backgroundColor: '#ef4444', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  )
}

export default function PawnPendingInterestCard({ pendingMonths, pawn, onPayPendingInterest, onAddToCart, onMarkAsPaid, cartItems }) {
  const [selectedPending, setSelectedPending] = useState([])

  useEffect(() => {
    setSelectedPending([])
  }, [cartItems])

  const isMonthInCart = (m) => {
    return cartItems?.some(item => {
      if (item.type !== 'pawn_interest') return false;
      const payments = item.payments || [item];
      return payments.some(p => p.pawn_record_id === pawn.id && p.month === m.month && p.year === m.year);
    })
  }

  const selectableIndexes = pendingMonths
    .map((_, i) => i)
    .filter(i => !isMonthInCart(pendingMonths[i]))

  if (!pendingMonths || pendingMonths.length === 0) return null

  return (
    <div className="card" style={{ marginTop: 20, borderLeft: '4px solid var(--red)', background: '#ffffff' }}>
      <div className="card-header">
        <span className="card-title" style={{ color: 'var(--red)' }}>ค้างชำระดอกเบี้ย</span>
        <span className="badge badge-red">ค้างจ่าย {pendingMonths.length} เดือน</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th width="40"></th>
              <th>งวดเดือน</th>
              <th>สถานะ</th>
              <th style={{ textAlign: 'right' }}>ยอดค้าง</th>
              <th style={{ textAlign: 'center', width: 80 }}>
                {selectableIndexes.length > 0 ? (
                  <input
                    type="checkbox"
                    style={{ cursor: 'pointer' }}
                    checked={selectableIndexes.length > 0 && selectedPending.length === selectableIndexes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPending(selectableIndexes)
                      } else {
                        setSelectedPending([])
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>เลือก</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {pendingMonths.map((m, idx) => {
              const isSelected = selectedPending.includes(idx)
              const inCart = isMonthInCart(m)
              return (
                <tr
                  key={idx}
                  style={{ background: isSelected ? 'var(--red-bg)' : 'transparent' }}
                >
                  <td><IconXCircle /></td>
                  <td>{thaiMonthShort(m.month)} {m.year + 543}</td>
                  <td style={{ color: 'var(--red)' }}>เกินกำหนดชำระ</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatBaht(pawn.interest_amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inCart ? (
                      <span style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600 }}>ในตะกร้า</span>
                    ) : (
                      <input
                        type="checkbox"
                        style={{ cursor: 'pointer' }}
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedPending(selectableIndexes.filter(i => i < idx))
                          } else {
                            setSelectedPending(selectableIndexes.filter(i => i <= idx))
                          }
                        }}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selectedPending.length > 0 && (
        <div className="pawn-detail-footer">
          <div className="pawn-detail-total-row">
            <span className="total-label">รวมยอดที่เลือก ({selectedPending.length} งวด):</span>
            <span className="total-val">
              {formatBaht(selectedPending.length * pawn.interest_amount)}
            </span>
          </div>
          <div className="pawn-detail-actions">
            <button
              className="btn btn-ghost"
              onClick={() => onMarkAsPaid && onMarkAsPaid(selectedPending)}
            >
              <FontAwesomeIcon icon={faCheck} /> ทำรายการว่าชำระแล้ว
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => onAddToCart(selectedPending)}
            >
              <FontAwesomeIcon icon={faCartPlus} /> ใส่ตะกร้า
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onPayPendingInterest(selectedPending)}
            >
              <FontAwesomeIcon icon={faCartArrowDown} /> ชำระเงิน
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
