import { useState, useEffect } from 'react'
import { CreateGoldItem, UpdateGoldItem } from 'wailsjs/go/handlers/GoldItemHandler'

import { getGoldMainTypes, getGoldSubtypes } from '@/utils/constants.js'

const BLANK = {
  type: '',
  subtype: '',
  purity: '96.5',
  weight_grams: '',
}

export default function GoldStockForm({ item, onSaved, onClose }) {
  const isEdit = !!item
  const [mainTypes, setMainTypes] = useState([])
  const [subtypes, setSubtypes] = useState([])
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getGoldMainTypes().then(setMainTypes)
    getGoldSubtypes().then(setSubtypes)
    if (item) {
      setForm({
        type: item.type || '',
        subtype: item.subtype || '',
        purity: item.purity || '96.5',
        weight_grams: item.weight_grams ? String(item.weight_grams) : '',
      })
    }
  }, [item])

  // When type changes, we could re-fetch subtypes specific to that type
  useEffect(() => {
    if (form.type) {
      getGoldSubtypes(form.type).then(setSubtypes)
    } else {
      getGoldSubtypes().then(setSubtypes)
    }
  }, [form.type])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    if (!form.type.trim()) return 'กรุณาเลือกหรือกรอกประเภท'
    if (!form.subtype.trim()) return 'กรุณากรอกรุ่น/น้ำหนัก (Subtype)'
    if (!form.weight_grams) return 'กรุณากรอกน้ำหนักชั่งจริง (กรัม)'
    if (!form.purity) return 'กรุณาระบุความบริสุทธิ์'

    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        id: isEdit ? item.id : 0,
        type: form.type,
        subtype: form.subtype,
        purity: form.purity,
        weight_grams: parseFloat(form.weight_grams) || 0,
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
              {mainTypes.map(t => (
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
            <div className="gf-type-row" style={{ marginBottom: 8 }}>
              {subtypes.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`gf-type-chip ${form.subtype === t ? 'gf-type-chip-active' : ''}`}
                  onClick={() => set('subtype', t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              className="input"
              type="text"
              placeholder="หรือพิมพ์รุ่น/น้ำหนักเอง เช่น 1.9 กรัม..."
              value={form.subtype}
              onChange={e => set('subtype', e.target.value)}
            />
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label form-label-required">ความบริสุทธิ์ (%)</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="เช่น 96.5"
                value={form.purity}
                onChange={e => set('purity', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">น้ำหนัก (กรัม)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.0001"
                placeholder="0.00"
                value={form.weight_grams}
                onChange={e => set('weight_grams', e.target.value)}
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
    </div>
  )
}
