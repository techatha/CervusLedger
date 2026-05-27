export default function NewSaleFormDiscount({ formData, setFormData }) {
  const setDiscountField = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  return (
    <>
      <div className="section-divider">รายละเอียดส่วนลด</div>
      <div className="form-group">
        <label className="form-label form-label-required">หัวข้อส่วนลด / การปรับลดราคา</label>
        <input
          className="input"
          placeholder="เช่น ส่วนลดพิเศษ, ปัดเศษ, ลดค่ากำเหน็จ..."
          value={formData.title}
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
            value={formData.amount}
            onChange={e => setDiscountField('amount', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">วันที่ทำรายการ</label>
          <input
            className="input"
            type="date"
            value={formData.date}
            onChange={e => setDiscountField('date', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="form-label">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
        <input
          className="input"
          placeholder="ระบุเหตุผลการลดราคา (เช่น ลูกค้าประจำ)"
          value={formData.notes}
          onChange={e => setDiscountField('notes', e.target.value)}
        />
      </div>
    </>
  )
}