import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTag } from '@fortawesome/free-solid-svg-icons'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import { formatBaht } from '@/utils/thai.js'

const DISCOUNT_PRESETS = [
  'ส่วนลดพิเศษ',
  'ปัดเศษ',
  'ลดค่ากำเหน็จ',
  'ลูกค้าประจำ',
  'ต่อรองราคา',
]

export default function NewSaleFormDiscount({ formData, setFormData }) {
  const setDiscountField = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  const amount = parseFloat(String(formData.amount).replace(/,/g, '') || 0)

  return (
    <>
      <div className="section-divider">รายละเอียดส่วนลด</div>

      {/* ─── Title + presets ─────────────────────────────────────── */}

      <div className="form-group">
        <label className="form-label form-label-required">หัวข้อส่วนลด / การปรับลดราคา</label>
        <div className="nsf-presets">
          {DISCOUNT_PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              className={`nsf-preset-chip${formData.title === preset ? ' nsf-preset-chip--active' : ''}`}
              onClick={() => setDiscountField('title', preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="เช่น ส่วนลดพิเศษ, ปัดเศษ, ลดค่ากำเหน็จ..."
          value={formData.title}
          onChange={e => setDiscountField('title', e.target.value)}
          autoFocus
        />
      </div>

      {/* ─── Amount + Date ───────────────────────────────────────── */}
      <div className="form-row" style={{ marginTop: '4px' }}>
        <div className="form-group">
          <label className="form-label form-label-required">จำนวนเงินส่วนลด (บาท)</label>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatNumberInput(formData.amount)}
            onChange={e => setDiscountField('amount', e.target.value)}
            onBlur={e => setDiscountField('amount', formatCurrency(e.target.value))}
          />
        </div>
      </div>

      {/* ─── Amount preview ──────────────────────────────────────── */}
      {amount > 0 && (
        <div className="nsf-total nsf-total-sell" style={{ marginBottom: '4px' }}>
          <span className="nsf-total-label nsf-total-label--icon">
            <FontAwesomeIcon icon={faTag} />
            ยอดส่วนลด
          </span>
          <span className="nsf-total-amount">{formatBaht(amount)}</span>
        </div>
      )}

      {/* ─── Notes ──────────────────────────────────────────────── */}
      <div className="form-group" style={{ marginTop: '4px' }}>
        <label className="form-label">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
        <textarea
          className="input"
          rows={2}
          placeholder="ระบุเหตุผลการลดราคา (เช่น ลูกค้าประจำ)"
          value={formData.notes}
          onChange={e => setDiscountField('notes', e.target.value)}
        />
      </div>
    </>
  )
}