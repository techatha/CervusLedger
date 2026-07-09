import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendDown, faArrowTrendUp } from '@fortawesome/free-solid-svg-icons'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'

const DISCOUNT_PRESETS = [
  'ส่วนลดพิเศษ',
  'ปัดเศษ',
  'ลดค่ากำเหน็จ',
  'ลูกค้าประจำ',
  'ต่อรองราคา',
]

const ADDITION_PRESETS = [
  'ค่าดอกเบี้ย',
  'ค่าแรงเพิ่ม',
  'ค่ากำเหน็จเพิ่ม',
  'งานเร่งด่วน',
  'ค่าบริการพิเศษ',
]

export default function NewSaleFormDiscount({ formData, setFormData }) {
  const setDiscountField = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  const type = formData.type || 'discount'
  const isAddition = type === 'addition'
  const presets = isAddition ? ADDITION_PRESETS : DISCOUNT_PRESETS

  const handleTypeChange = (newType) => {
    if (newType === type) return
    // Clear title only if it was a preset from the type we're leaving —
    // free-typed titles carry over fine either way.
    const oldPresets = isAddition ? ADDITION_PRESETS : DISCOUNT_PRESETS
    const wasPreset = oldPresets.includes(formData.title)
    setFormData(p => ({
      ...p,
      type: newType,
      title: wasPreset ? '' : p.title,
    }))
  }

  const amountNum = parseFloat(formData.amount) || 0

  return (
    <>
      <div className="section-divider">รายละเอียดส่วนปรับราคา</div>

      {/* ── Discount / Addition toggle ── */}
      <div className="form-group">
        <div className="nsf-adj-toggle">
          <button
            type="button"
            className={`nsf-adj-btn ${!isAddition ? 'nsf-adj-btn--discount' : ''}`}
            onClick={() => handleTypeChange('discount')}
          >
            <FontAwesomeIcon icon={faArrowTrendDown} /> ส่วนลด
          </button>
          <button
            type="button"
            className={`nsf-adj-btn ${isAddition ? 'nsf-adj-btn--addition' : ''}`}
            onClick={() => handleTypeChange('addition')}
          >
            <FontAwesomeIcon icon={faArrowTrendUp} /> เพิ่มเงิน
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label form-label-required">
          หัวข้อ{isAddition ? 'รายการเพิ่มเงิน' : 'ส่วนลด'} / การปรับ{isAddition ? 'เพิ่ม' : 'ลด'}ราคา
        </label>
        <div className="nsf-presets">
          {presets.map(preset => (
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
          placeholder={isAddition ? 'เช่น ค่าจัดส่ง, ค่าแรงเพิ่ม, งานเร่งด่วน...' : 'เช่น ส่วนลดพิเศษ, ปัดเศษ, ลดค่ากำเหน็จ...'}
          value={formData.title}
          onChange={e => setDiscountField('title', e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-row" style={{ marginTop: '4px' }}>
        <div className="form-group">
          <label className="form-label form-label-required">
            จำนวนเงิน{isAddition ? 'ที่เพิ่ม' : 'ส่วนลด'} (บาท)
          </label>
          <div className="nsf-adj-amount-wrap">
            <span className={`nsf-adj-amount-sign ${isAddition ? 'nsf-adj-amount-sign--addition' : 'nsf-adj-amount-sign--discount'}`}>
              {isAddition ? '+' : '−'}
            </span>
            <input
              className={`input nsf-adj-amount-input ${isAddition ? 'nsf-adj-amount-input--addition' : 'nsf-adj-amount-input--discount'}`}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatNumberInput(formData.amount)}
              onChange={e => setDiscountField('amount', e.target.value)}
              onBlur={e => setDiscountField('amount', formatCurrency(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '4px' }}>
        <label className="form-label">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
        <textarea
          className="input"
          rows={2}
          placeholder={isAddition ? 'ระบุเหตุผลการเพิ่มเงิน (เช่น ค่าจัดส่งด่วน)' : 'ระบุเหตุผลการลดราคา (เช่น ลูกค้าประจำ)'}
          value={formData.notes}
          onChange={e => setDiscountField('notes', e.target.value)}
        />
      </div>

      {amountNum > 0 && (
        <div className={`nsf-adj-preview ${isAddition ? 'nsf-adj-preview--addition' : 'nsf-adj-preview--discount'}`}>
          <span className="nsf-adj-preview-label">{formData.title || (isAddition ? 'เพิ่มเงิน' : 'ส่วนลด')}</span>
          <span className="nsf-adj-preview-val">{isAddition ? '+' : '−'}{formatCurrency(String(amountNum))} บาท</span>
        </div>
      )}
    </>
  )
}