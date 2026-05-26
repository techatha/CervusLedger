import { useState } from 'react'

const today = () => new Date().toISOString().slice(0, 10)

const BLANK_DISCOUNT = {
  title: 'ส่วนลดพิเศษ',
  amount: '',
  notes: '',
  date: today(),
}

export default function NewSaleFormDiscount({ todayPrice, saving, error, setError, onSave, onClose }) {
  const [discount, setDiscount] = useState({
    ...BLANK_DISCOUNT,
  })

  const setDiscountField = (k, v) => setDiscount(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    setError(null)
    if (!discount.title.trim()) { setError('กรุณากรอกหัวข้อส่วนลด'); return }
    if (!discount.amount || parseFloat(discount.amount) <= 0) { setError('กรุณากรอกมูลค่าส่วนลดให้ถูกต้อง'); return }

    const priceID = todayPrice?.id || 0
    const payload = {
      type: 'discount',
      customer_id: 0,
      gold_item_id: 0,
      weight_baht: 0,
      gold_price_id: priceID,
      price_per_baht: 0,
      total_amount: parseFloat(discount.amount),
      notes: discount.notes,
      date: discount.date,
      item_type: '', purity: '', description: '',
      label: discount.title,
    }

    onSave(payload)
  }

  return (
    <>
      <div className="modal-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="section-divider">รายละเอียดส่วนลด</div>
        <div className="form-group">
          <label className="form-label form-label-required">หัวข้อส่วนลด / การปรับลดราคา</label>
          <input
            className="input"
            placeholder="เช่น ส่วนลดพิเศษ, ปัดเศษ, ลดค่ากำเหน็จ..."
            value={discount.title}
            onChange={e => setDiscountField('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label form-label-required">จำนวนเงินส่วนลด (บาท)</label>
            <input
              className="input"
              type="number"
              placeholder="0.00"
              min="0"
              value={discount.amount}
              onChange={e => setDiscountField('amount', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">วันที่ทำรายการ</label>
            <input
              className="input"
              type="date"
              value={discount.date}
              onChange={e => setDiscountField('date', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
          <input
            className="input"
            placeholder="ระบุเหตุผลการลดราคา (เช่น ลูกค้าประจำ)"
            value={discount.notes}
            onChange={e => setDiscountField('notes', e.target.value)}
          />
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ background: 'var(--blue, #3b82f6)', color: '#fff', border: 'none' }}>
          {saving ? 'กำลังบันทึก...' : 'เพิ่มส่วนลดลงตะกร้า'}
        </button>
      </div>
    </>
  )
}
