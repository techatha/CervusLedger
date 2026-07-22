import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendDown, faArrowTrendUp, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import './PriceAdjustment.css'

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

export default function NewSaleFormPriceAdjustment({ formData, setFormData }) {
  const setDiscountField = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  const type = formData.type || 'discount'
  const isAddition = type === 'addition'
  const presets = isAddition ? ADDITION_PRESETS : DISCOUNT_PRESETS

  const handleTypeChange = (newType) => {
    if (newType === type) return
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

      <div className="nsf-adj-fields">
        {/* ── Discount / Addition toggle ── */}
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

        {/* ── Title ── */}
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

        {/* ── Amount ── */}
        <div className="form-group">
          <label className="form-label form-label-required">
            จำนวนเงิน{isAddition ? 'ที่เพิ่ม' : 'ส่วนลด'} (บาท)
          </label>
          <div className={`nsf-adj-amount-field ${isAddition ? 'nsf-adj-amount-field--addition' : 'nsf-adj-amount-field--discount'}`}>
            <span className={`nsf-adj-amount-sign ${isAddition ? 'nsf-adj-amount-sign--addition' : 'nsf-adj-amount-sign--discount'}`}>
              <FontAwesomeIcon icon={isAddition ? faPlus : faMinus} />
            </span>
            <input
              className="input nsf-adj-amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatNumberInput(formData.amount)}
              onChange={e => setDiscountField('amount', e.target.value)}
              onBlur={e => setDiscountField('amount', formatCurrency(e.target.value))}
            />
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="form-group">
          <label className="form-label">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
          <textarea
            className="input"
            rows={2}
            placeholder={isAddition ? 'ระบุเหตุผลการเพิ่มเงิน (เช่น ค่าจัดส่งด่วน)' : 'ระบุเหตุผลการลดราคา (เช่น ลูกค้าประจำ)'}
            value={formData.notes}
            onChange={e => setDiscountField('notes', e.target.value)}
          />
        </div>

        {/* ── Preview ── */}
        {amountNum > 0 && (
          <div className={`nsf-adj-preview ${isAddition ? 'nsf-adj-preview--addition' : 'nsf-adj-preview--discount'}`}>
            <span className="nsf-adj-preview-label">{formData.title || (isAddition ? 'เพิ่มเงิน' : 'ส่วนลด')}</span>
            <span className="nsf-adj-preview-val">{isAddition ? '+' : '−'}{formatCurrency(String(amountNum))} บาท</span>
          </div>
        )}
      </div>
    </>
  )
}
