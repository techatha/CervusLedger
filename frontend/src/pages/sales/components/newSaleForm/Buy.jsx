import { useState } from 'react'
import { CreateSale } from 'wailsjs/go/handlers/SaleHandler.js'
import { parseWeightToBaht } from '@/utils/number.js'
import { fullName } from '@/utils/thai.js'
import CustomerNoteSection from './CustomerNote.jsx'

const today = () => new Date().toISOString().slice(0, 10)

const BLANK_BUY = {
  item_type: '',
  item_subtype: '',
  weight_baht: '',
  customer_id: 0,
  customer_label: '',
  total_amount: '',
  notes: '',
  date: today(),
  is_inventory: 0,
}

export default function NewSaleFormBuy({ todayPrice, onAdd, onSaved, onClose }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [buy, setBuy] = useState({
    ...BLANK_BUY,
  })

  const setBuyField = (k, v) => setBuy(p => ({ ...p, [k]: v }))

  const handleBuySubtypeChange = (val) => {
    const estWeight = parseWeightToBaht(val)
    setBuy(prev => ({
      ...prev,
      item_subtype: val,
      weight_baht: estWeight > 0 ? String(estWeight.toFixed(4)) : prev.weight_baht
    }))
  }

  const handleSave = async () => {
    setError(null)
    if (!buy.customer_id) { setError('กรุณาเลือกลูกค้าสำหรับการรับซื้อทอง'); return }
    if (!buy.item_type.trim()) { setError('กรุณากรอกประเภททอง'); return }
    if (!buy.item_subtype.trim()) { setError('กรุณากรอกรุ่น/น้ำหนัก (Subtype)'); return }
    if (!buy.weight_baht) { setError('กรุณากรอกน้ำหนัก'); return }
    if (!buy.total_amount) { setError('กรุณากรอกราคารับซื้อรวม'); return }

    setSaving(true)
    try {
      const priceID = todayPrice?.id || 0
      const payload = {
        type: 'buy',
        customer_id: buy.customer_id,
        gold_item_id: 0,
        weight_baht: parseFloat(buy.weight_baht),
        gold_price_id: priceID,
        price_per_baht: 0,
        total_amount: parseFloat(buy.total_amount),
        notes: buy.notes,
        date: buy.date,
        item_type: buy.item_type,
        item_subtype: buy.item_subtype,
        is_inventory: buy.is_inventory,
      }

      if (onAdd) {
        onAdd({
          ...payload,
          label: `รับซื้อ: ${buy.item_type} — ${buy.item_subtype || (buy.weight_baht + ' บาท')}`,
          notes: buy.notes
        })
      } else {
        await CreateSale(payload)
        onSaved()
      }
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="section-divider">รายละเอียดทองที่รับซื้อ</div>
        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label form-label-required">ประเภททอง</label>
            <input
              className="input"
              placeholder="เช่น สร้อยคอ, แหวน, ต่างหู"
              value={buy.item_type}
              onChange={e => setBuyField('item_type', e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label form-label-required">รุ่น / น้ำหนัก (Subtype)</label>
            <input
              className="input"
              placeholder="เช่น 1 บาท, 2 สลึง, 1.9 กรัม"
              value={buy.item_subtype}
              onChange={e => handleBuySubtypeChange(e.target.value)}
            />
          </div>
        </div>

        <div className="section-divider">ราคา & วันที่</div>
        <div className="form-row form-row-3">
          <div className="form-group">
            <label className="form-label form-label-required">น้ำหนักประเมิน (บาท)</label>
            <input
              className="input"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.0001"
              value={buy.weight_baht}
              onChange={e => setBuyField('weight_baht', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label form-label-required">ราคารับซื้อรวม (บาท)</label>
            <input
              className="input"
              type="number"
              value={buy.total_amount}
              onChange={e => setBuyField('total_amount', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">วันที่</label>
            <input
              className="input"
              type="date"
              value={buy.date}
              onChange={e => setBuyField('date', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '15px' }}>
          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={buy.is_inventory === 1}
              onChange={e => setBuyField('is_inventory', e.target.checked ? 1 : 0)}
              style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
            />
            <span>นำเข้าคลังสินค้าหลัก (บันทึกในคลังสำหรับนับสต็อกประจำเดือน)</span>
          </label>
        </div>

        <CustomerNoteSection
          tabMode="buy"
          customerId={buy.customer_id}
          customerLabel={buy.customer_label}
          notes={buy.notes}
          onCustomerSelect={(c) => {
            setBuy(prev => ({ ...prev, customer_id: c.id, customer_label: fullName(c) }))
          }}
          onCustomerClear={() => setBuy(prev => ({ ...prev, customer_id: 0, customer_label: '' }))}
          onNotesChange={(text) => setBuy(prev => ({ ...prev, notes: text }))}
        />
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ background: 'var(--amber)', color: '#fff', border: 'none' }}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกการรับซื้อ'}
        </button>
      </div>
    </>
  )
}
