import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileCirclePlus, faTag, faQrcode } from '@fortawesome/free-solid-svg-icons'
import { faTrashCan } from '@fortawesome/free-regular-svg-icons'

export default function SalesCart({
  cartItems,
  onDeleteItem,
  onShowForm,
  mainTotalAmount,
  onClearCart,
  onSaveAllSales,
  savingCart,
}) {
  return (
    <div className="sales-cart-container">
      <div className="sales-cart-header">
        <span className="sales-cart-title">รายการขาย</span>
        <span className="badge badge-gold" style={{ fontSize: '11px', fontWeight: 'bold' }}>
          {cartItems.length} รายการ
        </span>
      </div>
      <div className="sales-cart-body">
        {cartItems.length === 0 ? (
          <div className="empty-cart-state">
            <div className="empty-cart-icon">🛒</div>
            <div style={{ fontWeight: 'bold' }}>ยังไม่มีรายการขาย</div>
          </div>
        ) : (
          <table className="sales-cart-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ประเภท</th>
                <th className="col-200">รายละเอียด</th>
                <th style={{ textAlign: 'right', width: '120px' }}>น้ำหนัก</th>
                <th style={{ textAlign: 'right', width: '120px' }}>ราคา/บาท</th>
                <th style={{ textAlign: 'right', width: '140px' }}>ยอดรวม</th>
                <th style={{ width: '40px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <span className={`badge ${item.type === 'sell' ? 'badge-green' :
                      item.type === 'buy' ? 'badge-amber' :
                        item.type === 'discount' ? 'badge-red' : 'badge-purple'
                      }`} style={{ fontSize: '11px' }}>
                      {item.type === 'sell' ? 'ขาย' :
                        item.type === 'buy' ? 'รับซื้อ' :
                          item.type === 'discount' ? 'ส่วนลด' : 'ดอกเบี้ย'}
                    </span>
                  </td>

                  {/* ── Label & Sub-Notes Column ── */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                        {item.label}
                      </span>

                      {/* Render the small gray note if notes exists in data */}
                      {item.notes && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>
                          {item.notes}
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                    {item.type === 'pawn_interest' || item.type === 'discount' ? '—' : item.weight_baht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' บาท'}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {item.type === 'pawn_interest' || item.type === 'discount' ? '—' : item.price_per_baht.toLocaleString('th-TH')}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 'bold',
                    color: item.type === 'sell' ? 'var(--green)' :
                      item.type === 'buy' ? 'var(--red)' :
                        item.type === 'discount' ? 'var(--red)' : 'var(--blue)'
                  }}>
                    {item.type === 'discount' ? '-' : ''} {item.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn-delete"
                      onClick={() => onDeleteItem(idx)}
                      title="ลบรายการ"
                      style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '15px' }}
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="sales-cart-add-wrapper">
          <button
            className="btn btn-ghost btn-add-item"
            onClick={() => onShowForm('sell')}>
            <FontAwesomeIcon icon={faFileCirclePlus} /> เพิ่มรายการ
          </button>
          <button
            className="btn btn-ghost btn-discount-item"
            onClick={() => onShowForm('discount')}
          >
            <FontAwesomeIcon icon={faTag} /> เพิ่มส่วนลด
          </button>
        </div>
      </div>
      {cartItems.length > 0 && (
        <div className="sales-cart-footer">
          <div className="sales-cart-total-row">
            <span className="total-label">ยอดรวมสุทธิ:</span>
            <span className="total-val">
              {mainTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
            </span>
          </div>
          <div className="sales-cart-actions">
            <button className="btn btn-ghost" onClick={onClearCart} disabled={savingCart}>
              <FontAwesomeIcon icon={faTrashCan} /> ล้างตะกร้า
            </button>
            <button
              className="btn btn-primary"
              onClick={onSaveAllSales}
              disabled={savingCart}
              style={mainTotalAmount < 0 ? { background: 'var(--amber)', color: '#fff', border: 'none' } : {}}
            >
              {savingCart ? 'กำลังบันทึกรายการ...' : 'ยืนยันจ่ายเงินสำเร็จ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
