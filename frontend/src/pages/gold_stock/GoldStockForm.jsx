import { useState, useEffect } from 'react'
import {
  CreateGoldItem,
  UpdateGoldItem,
  GetGoldMainTypes,
} from 'wailsjs/go/gold_item_handler/GoldItemHandler'
import './GoldStockForm.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const SUBTYPE_PRESETS = [
  'ครึ่งสลึง', '1 สลึง', '2 สลึง', '3 สลึง',
  '1 บาท', '2 บาท', '3 บาท',
]

const PURITY_PRESETS = [
  { value: '99.99', label: '99.99%' },
  { value: '96.5', label: '96.5%' },
  { value: '91.6', label: '91.6%' },
  { value: '90', label: '90%' },
  { value: '75', label: '75%' },
  { value: '58.3', label: '58.3%' },
  { value: '37.5', label: '37.5%' },
]

const BLANK = {
  type: '',
  subtype: '',
  purity: '96.5',
  weight_grams: '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GoldStockForm({ item, onSaved, onClose }) {
  const isEdit = !!item

  const [mainTypes, setMainTypes] = useState([])
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Type: show "add new" input when user clicks the link
  const [showNewType, setShowNewType] = useState(false)
  const [newTypeText, setNewTypeText] = useState('')

  // Purity: 'preset' | 'custom'
  const [purityMode, setPurityMode] = useState('preset')

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    GetGoldMainTypes().then(setMainTypes)
    if (item) {
      setForm({
        type: item.type || '',
        subtype: item.subtype || '',
        purity: item.purity || '96.5',
        weight_grams: item.weight_grams ? String(item.weight_grams) : '',
      })
      // If the saved purity isn't in the presets, open custom mode
      const isCustomPurity = !PURITY_PRESETS.some(p => p.value === (item.purity || '96.5'))
      if (isCustomPurity) setPurityMode('custom')
    }
  }, [item])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Type handlers ─────────────────────────────────────────────────────────
  const handleTypeSelect = (e) => {
    set('type', e.target.value)
    setShowNewType(false)
    setNewTypeText('')
  }

  const handleNewTypeConfirm = () => {
    const t = newTypeText.trim()
    if (t) {
      set('type', t)
      // Optimistically add to the dropdown list so it appears selected
      if (!mainTypes.includes(t)) setMainTypes(prev => [...prev, t])
    }
    setShowNewType(false)
    setNewTypeText('')
  }

  const handleCancelNewType = () => {
    setShowNewType(false)
    setNewTypeText('')
  }

  // ── Subtype chip handler ──────────────────────────────────────────────────
  const handleSubtypeChip = (val) => {
    set('subtype', val)
  }

  // ── Purity handlers ───────────────────────────────────────────────────────
  const handlePuritySelect = (e) => {
    const v = e.target.value
    if (v === '__custom') {
      setPurityMode('custom')
      set('purity', '')
    } else {
      setPurityMode('preset')
      set('purity', v)
    }
  }

  // ── Validate & save ───────────────────────────────────────────────────────
  const validate = () => {
    if (!form.type.trim()) return 'กรุณาเลือกหรือกรอกประเภท'
    if (!form.subtype.trim()) return 'กรุณาเลือกหรือกรอกรุ่น / น้ำหนัก'
    if (!form.purity) return 'กรุณาระบุความบริสุทธิ์'
    if (!form.weight_grams) return 'กรุณากรอกน้ำหนัก (กรัม)'
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal gsf-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title">
            {isEdit ? 'แก้ไขรายการทอง' : 'เพิ่มรายการทองใหม่'}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body gsf-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="gsf-section-label">รายละเอียดทอง</div>

          {/* ── Type ──────────────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label form-label-required">ประเภท</label>

            <select
              className="input"
              value={showNewType ? '__new' : form.type}
              onChange={handleTypeSelect}
              autoFocus={!isEdit}
            >
              <option value="">— เลือกประเภท —</option>
              {mainTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <button
              className="gsf-link-btn"
              onClick={() => setShowNewType(true)}
            >
              + เพิ่มประเภทใหม่
            </button>

            {/* New type inline input */}
            {showNewType && (
              <div className="gsf-new-type-box">
                <input
                  className="input"
                  placeholder="พิมพ์ประเภทใหม่..."
                  value={newTypeText}
                  onChange={e => setNewTypeText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNewTypeConfirm() }}
                  autoFocus
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleNewTypeConfirm}
                  disabled={!newTypeText.trim()}
                >
                  ยืนยัน
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancelNewType}
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>

          {/* ── Subtype ───────────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label form-label-required">รุ่น / น้ำหนัก</label>

            {/* Preset chips */}
            <div className="gsf-chips">
              {SUBTYPE_PRESETS.map(val => (
                <button
                  key={val}
                  type="button"
                  className={`gsf-chip ${form.subtype === val ? 'gsf-chip-active' : ''}`}
                  onClick={() => handleSubtypeChip(val)}
                >
                  {val}
                </button>
              ))}
            </div>

            {/* Free-text — always visible; typing clears chip selection */}
            <input
              className="input"
              type="text"
              placeholder="หรือพิมพ์เองได้ เช่น 1.9 กรัม..."
              value={form.subtype}
              onChange={e => set('subtype', e.target.value)}
            />
            <span className="gsf-hint">เลือกจากรายการด้านบน หรือพิมพ์ขนาดที่ต้องการ</span>
          </div>

          {/* ── Purity + Weight ───────────────────────────────────── */}
          <div className="form-row form-row-2">

            {/* Purity */}
            <div className="form-group">
              <label className="form-label form-label-required">ความบริสุทธิ์</label>

              <select
                className="input"
                value={purityMode === 'custom' ? '__custom' : form.purity}
                onChange={handlePuritySelect}
              >
                <option value="">— เลือก —</option>
                {PURITY_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
                <option value="__custom">กรอกเอง...</option>
              </select>

              {/* Custom purity input — revealed when user picks "กรอกเอง" */}
              {purityMode === 'custom' && (
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="เช่น 80.5"
                  value={form.purity}
                  onChange={e => set('purity', e.target.value)}
                  autoFocus
                  style={{ marginTop: 6 }}
                />
              )}
            </div>

            {/* Weight */}
            <div className="form-group">
              <label className="form-label form-label-required">น้ำหนัก (กรัม)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.0001"
                placeholder="0.0000"
                value={form.weight_grams}
                onChange={e => set('weight_grams', e.target.value)}
              />
            </div>

          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            ยกเลิก
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
          </button>
        </div>

      </div>
    </div>
  )
}