import { useState, useEffect } from 'react'
import { CreateGoldItem, UpdateGoldItem } from '../../../wailsjs/go/handlers/GoldItemHandler'

const GOLD_TYPES = [
  'ทองแท่ง', 'สร้อยคอ', 'สร้อยข้อมือ', 'แหวน',
  'ต่างหู', 'กำไล', 'จี้', 'เหรียญทอง', 'อื่นๆ',
]

const PURITIES = ['96.5%', '99.9%', '99.99%', '90%', 'อื่นๆ']

const BLANK = {
  type:        '',
  weight_baht: '',
  purity:      '96.5%',
  description: '',
  status:      'available',
}

export default function GoldForm({ item, onSaved, onClose }) {
  const isEdit = !!item
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  useEffect(() => {
    if (item) {
      setForm({
        type:        item.type        || '',
        weight_baht: item.weight_baht != null ? String(item.weight_baht) : '',
        purity:      item.purity      || '96.5%',
        description: item.description || '',
        status:      item.status      || 'available',
      })
    }
  }, [item])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    if (!form.type.trim())      return 'กรุณาเลือกหรือกรอกประเภท'
    const w = parseFloat(form.weight_baht)
    if (!w || w <= 0)           return 'กรุณากรอกน้ำหนักที่ถูกต้อง'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        id:          isEdit ? item.id : 0,
        type:        form.type,
        weight_baht: parseFloat(form.weight_baht),
        purity:      form.purity,
        description: form.description,
        status:      form.status,
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

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label form-label-required">น้ำหนัก (บาท)</label>
              <input
                className="input"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.0001"
                value={form.weight_baht}
                onChange={e => set('weight_baht', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">ความบริสุทธิ์</label>
              <select
                className="input"
                value={form.purity}
                onChange={e => set('purity', e.target.value)}
              >
                {PURITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">รายละเอียดเพิ่มเติม</label>
            <input
              className="input"
              placeholder="ลักษณะ, เครื่องหมาย, ยี่ห้อ..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Status — only show when editing */}
          {isEdit && (
            <>
              <div className="section-divider">สถานะ</div>
              <div className="form-group">
                <label className="form-label">สถานะรายการ</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                >
                  <option value="available">มีอยู่</option>
                  <option value="sold">ขายแล้ว</option>
                </select>
              </div>
            </>
          )}
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
