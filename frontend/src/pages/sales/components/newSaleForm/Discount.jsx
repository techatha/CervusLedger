import { formatNumberInput, formatCurrency } from '@/utils/number.js'

const DISCOUNT_PRESETS = [
  'ส่วนลดพิเศษ',
  'ปัดเศษ',
  'ลดค่ากำเหน็จ',
  'ลูกค้าประจำ',
  'ต่อรองราคา',
]

export default function NewSaleFormDiscount({ formData, setFormData }) {
  const setDiscountField = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  return (
    <>
      <div className="section-divider">รายละเอียดส่วนลด</div>

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