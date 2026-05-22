import { formatBaht, toBE } from '../../utils/thai'
import './receipt.css'

/**
 * SaleReceipt
 * Props:
 *   sale     — Sale object (with customer_name, gold_item_type)
 *   shop     — ShopSettings
 *   onClose  — fn
 */
export default function SaleReceipt({ sale, shop, onClose }) {
  const handlePrint = () => window.print()

  const isSell   = sale.type === 'sell'
  const title    = isSell ? 'ใบขายทอง' : 'ใบรับซื้อทอง'
  const pricePerBaht = sale.weight_baht > 0
    ? (sale.total_amount / sale.weight_baht)
    : 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal receipt-preview-modal"
        style={{ width: 480 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">ตัวอย่างใบ{isSell ? 'ขาย' : 'รับซื้อ'}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <IconPrint /> พิมพ์
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="receipt-preview-body">
          <div className="print-root">
            <div className="receipt-paper">

              {/* Shop header */}
              <div className="rcp-shop-header">
                <div className="rcp-shop-name">{shop.shop_name || 'ร้านทองของเรา'}</div>
                {shop.shop_address && <div className="rcp-shop-addr">{shop.shop_address}</div>}
                {shop.shop_phone   && <div className="rcp-shop-phone">โทร. {shop.shop_phone}</div>}
              </div>

              {/* Title + date */}
              <div className="rcp-title-row">
                <div className="rcp-title">{title}</div>
                <div style={{ fontSize:13, color:'#555' }}>{toBE(sale.date)}</div>
              </div>

              {/* Customer */}
              <div className="rcp-section">
                <div className="rcp-section-title">ลูกค้า</div>
                <div className="rcp-row">
                  <span className="rcp-label">ชื่อ-นามสกุล</span>
                  <span className="rcp-value rcp-value-lg">
                    {sale.customer_name || 'ลูกค้าทั่วไป'}
                  </span>
                </div>
              </div>

              {/* Item */}
              <div className="rcp-section">
                <div className="rcp-section-title">รายการ</div>
                <div className="rcp-row">
                  <span className="rcp-label">ประเภท</span>
                  <span className="rcp-value rcp-value-lg">{sale.gold_item_type || '—'}</span>
                </div>
                <div className="rcp-row">
                  <span className="rcp-label">น้ำหนัก</span>
                  <span className="rcp-value">
                    {sale.weight_baht?.toLocaleString('th-TH', { maximumFractionDigits:4 })} บาท
                  </span>
                </div>
              </div>

              {/* Financials */}
              <div className="rcp-finance">
                <div className="rcp-section-title" style={{ marginBottom:6 }}>ราคา</div>
                <div className="rcp-finance-row">
                  <span>ราคา / บาท</span>
                  <span style={{ fontVariantNumeric:'tabular-nums' }}>
                    {pricePerBaht.toLocaleString('th-TH')} ฿
                  </span>
                </div>
                <div className="rcp-finance-row">
                  <span>น้ำหนัก</span>
                  <span>
                    {sale.weight_baht?.toLocaleString('th-TH', { maximumFractionDigits:4 })} บาท
                  </span>
                </div>
                <div className="rcp-finance-row rcp-total">
                  <span>ยอดรวม</span>
                  <span style={{ fontVariantNumeric:'tabular-nums' }}>
                    {formatBaht(sale.total_amount)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {sale.notes && (
                <div className="rcp-section">
                  <div className="rcp-row">
                    <span className="rcp-label">หมายเหตุ</span>
                    <span className="rcp-value">{sale.notes}</span>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="rcp-sigs">
                <div className="rcp-sig">
                  <div className="rcp-sig-line" />
                  <div className="rcp-sig-label">ลายมือชื่อลูกค้า</div>
                </div>
                <div className="rcp-sig">
                  <div className="rcp-sig-line" />
                  <div className="rcp-sig-label">ลายมือชื่อเจ้าหน้าที่</div>
                </div>
              </div>

              <div className="rcp-copy-label">
                {isSell ? 'ใบขายทอง' : 'ใบรับซื้อทอง'}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <IconPrint /> พิมพ์
          </button>
        </div>
      </div>
    </div>
  )
}

function IconPrint() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
}
