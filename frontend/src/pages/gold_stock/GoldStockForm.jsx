import { useState, useEffect } from 'react'
import { CreateGoldItem, UpdateGoldItem } from 'wailsjs/go/handlers/GoldItemHandler'

const GOLD_TYPES = [
  'ทองแท่ง', 'สร้อยคอ', 'สร้อยข้อมือ', 'แหวน',
  'ต่างหู', 'กำไล', 'จี้', 'เหรียญทอง', 'อื่นๆ',
]

const BLANK = {
  type:    '',
  subtype: '',
}

export default function GoldStockForm({ item, onSaved, onClose }) {
  const isEdit = !!item
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  useEffect(() => {
    if (item) {
      setForm({
        type:    item.type    || '',
        subtype: item.subtype || '',
      })
    }
  }, [item])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    if (!form.type.trim())      return 'กรุณาเลือกหรือกรอกประเภท'
    if (!form.subtype.trim())   return 'กรุณากรอกรุ่น/น้ำหนัก (Subtype)'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        id:      isEdit ? item.id : 0,
        type:    form.type,
        subtype: form.subtype,
      }
      if (isEdit) {
        await UpdateGoldItem(payload)
      } else {
        await CreateGoldItem(payload)
      }
      onSaved()
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {isEdit ? 'แก้ไขรายการทอง' : 'เพิ่มรายการทองใหม่'}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="section-divider">รายละเอียดทอง</div>

          {/* Type — combo: preset list + free text */}
          <div className="form-group">
            <label className="form-label form-label-required">ประเภท</label>
            <div className="gf-type-row">
              {GOLD_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`gf-type-chip ${form.type === t ? 'gf-type-chip-active' : ''}`}
                  onClick={() => set('type', t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* Allow free-text override */}
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="หรือพิมพ์ประเภทเอง..."
              value={form.type}
              onChange={e => set('type', e.target.value)}
              autoFocus={!isEdit}
            />
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">รุ่น / น้ำหนัก (Subtype)</label>
            <input
              className="input"
              type="text"
              placeholder="เช่น 1 บาท, 2 สลึง, ครึ่งสลึง, 1.9 กรัม..."
              value={form.subtype}
              onChange={e => set('subtype', e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'เพิ่มรายการ'}
          </button>
        </div>
      </div>
    </div>
  )
}
