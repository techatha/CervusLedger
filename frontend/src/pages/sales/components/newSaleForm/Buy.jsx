import { fullName } from '@/utils/thai.js'
import CustomerNoteSection from './CustomerNote.jsx'
import GoldTypeSelectSection from './GoldTypeSelectSection.jsx'

export default function NewSaleFormBuy({ formData, setFormData }) {
  const setBuyField = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  return (
    <>
      <GoldTypeSelectSection
        tabMode="buy"
        itemType={formData.item_type}
        itemSubtype={formData.item_subtype}
        onChange={(fields) => setFormData(prev => ({ ...prev, ...fields }))}
      />

      {/* เพิ่มช่องกรอกราคาตามที่คุณเคยใส่ไว้ ก่อนที่จะเปลี่ยนเป็น GoldStockForm (ใช้รองรับไปก่อน) */}
      <div className="section-divider">สรุปราคา</div>
      <div className="form-row form-row-2">
        <div className="form-group">
          <label className="form-label form-label-required">น้ำหนักประเมิน (บาท)</label>
          <input
            className="input"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.0001"
            value={formData.weight_baht}
            onChange={e => setBuyField('weight_baht', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">ราคารับซื้อรวม (บาท)</label>
          <input
            className="input"
            type="number"
            value={formData.total_amount}
            onChange={e => setBuyField('total_amount', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '15px' }}>
        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={formData.is_inventory === 1}
            onChange={e => setBuyField('is_inventory', e.target.checked ? 1 : 0)}
            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
          />
          <span>นำเข้าคลังสินค้าหลัก (บันทึกในคลังสำหรับนับสต็อกประจำเดือน)</span>
        </label>
      </div>

      <CustomerNoteSection
        tabMode="buy"
        customerId={formData.customer_id}
        customerLabel={formData.customer_label}
        notes={formData.notes}
        onCustomerSelect={(c) => setFormData(prev => ({ ...prev, customer_id: c.id, customer_label: fullName(c) }))}
        onCustomerClear={() => setFormData(prev => ({ ...prev, customer_id: 0, customer_label: '' }))}
        onNotesChange={(text) => setFormData(prev => ({ ...prev, notes: text }))}
      />
    </>
  )
}