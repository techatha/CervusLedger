import { useState, useEffect, useRef } from 'react'
import { CreateIncomeExpense } from 'wailsjs/go/handlers/IncomeExpenseHandler'
import { GetAllSettings } from 'wailsjs/go/handlers/SettingsHandler'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp,faArrowTrendDown, faPlus } from '@fortawesome/free-solid-svg-icons'

import { getLocalISOString } from '@/utils/date'

const today = () => getLocalISOString().slice(0, 10)

export default function ManualEntryModal({ onSaved, onClose, defaultDate }) {
  const [form, setForm] = useState({
    type: 'income',
    category: '',
    amount: '',
    notes: '',
    date: defaultDate || today(),
    color: '',
  })
  const [presets, setPresets] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [isManual, setIsManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const amountRef = useRef(null)

  useEffect(() => {
    GetAllSettings()
      .then(data => {
        try {
          if (data.income_expense_presets) {
            setPresets(JSON.parse(data.income_expense_presets))
          }
        } catch (e) {
          console.error("Failed to parse presets:", e)
        }
      })
      .catch(console.error)
  }, [])

  // Focus amount input on mount
  useEffect(() => {
    if (amountRef.current) amountRef.current.focus()
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleTypeChange = (t) => {
    setForm(p => ({ ...p, type: t }))
    // Deselect chip if its type doesn't match
    if (selectedIdx !== null && !isManual) {
      const preset = presets[selectedIdx]
      if (preset && preset.type !== t) {
        setSelectedIdx(null)
        setForm(p => ({ ...p, type: t, category: '', color: '' }))
      }
    }
  }

  const handleChipClick = (idx) => {
    if (selectedIdx === idx) {
      // Deselect
      setSelectedIdx(null)
      setIsManual(false)
      setForm(p => ({ ...p, category: '', color: '' }))
    } else {
      setSelectedIdx(idx)
      setIsManual(false)
      const preset = presets[idx]
      setForm(p => ({
        ...p,
        category: preset.name,
        type: preset.type,
        color: preset.color,
      }))
      // Focus amount after selecting category
      setTimeout(() => amountRef.current?.focus(), 50)
    }
  }

  const handleManualToggle = () => {
    setSelectedIdx(null)
    setIsManual(!isManual)
    if (!isManual) {
      setForm(p => ({ ...p, category: '', color: '#cbd5e1' }))
    } else {
      setForm(p => ({ ...p, category: '', color: '' }))
    }
  }

  const validate = () => {
    if (!form.category.trim()) return 'กรุณาเลือกหรือกรอกหมวดหมู่'
    const a = parseFloat(form.amount)
    if (!a || a <= 0) return 'กรุณากรอกจำนวนเงิน'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError(null)
    try {
      await CreateIncomeExpense({
        type: form.type,
        category: form.category,
        amount: parseFloat(form.amount),
        notes: form.notes,
        date: form.date,
      })
      onSaved()
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  // Handle Enter key to save
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !saving) handleSave()
  }

  const isIncome = form.type === 'income'

  // Split presets by type
  const incomePresets = presets.map((p, i) => ({ ...p, _idx: i })).filter(p => p.type === 'income')
  const expensePresets = presets.map((p, i) => ({ ...p, _idx: i })).filter(p => p.type === 'expense')
  const filteredPresets = isIncome ? incomePresets : expensePresets

  return (
    <div className="modal-backdrop mem-backdrop" onClick={onClose}>
      <div className="modal mem-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>

        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-title">
            {isIncome ? <FontAwesomeIcon icon={faArrowTrendUp} /> : <FontAwesomeIcon icon={faArrowTrendDown} />}{' '}
            {isIncome ? 'เพิ่มรายรับ' : 'เพิ่มรายจ่าย'}
          </div>
          <button className="modal-close" onClick={onClose} title="ปิด">✕</button>
        </div>

        {/* ── Type toggle (always visible) ── */}
        <div className="mem-type-header">
          <button
            className={`mem-type-btn ${isIncome ? 'mem-type-income' : ''}`}
            type="button"
            onClick={() => handleTypeChange('income')}
          >
            <span className="mem-type-icon">▲</span>
            รายรับ
          </button>
          <button
            className={`mem-type-btn ${!isIncome ? 'mem-type-expense' : ''}`}
            type="button"
            onClick={() => handleTypeChange('expense')}
          >
            <span className="mem-type-icon">▼</span>
            รายจ่าย
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error mem-error-shake">
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── Category chips ── */}
          <div className="form-group">
            <label className="form-label form-label-required">หมวดหมู่</label>

            {filteredPresets.length > 0 && (
              <div className="mem-cat-chips">
                {filteredPresets.map(p => (
                  <button
                    key={p._idx}
                    type="button"
                    className={`mem-chip ${selectedIdx === p._idx ? 'mem-chip-active' : ''}`}
                    style={{
                      '--chip-color': p.color,
                      '--chip-bg': p.color + '1A',
                    }}
                    onClick={() => handleChipClick(p._idx)}
                  >
                    <span
                      className="mem-chip-dot"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  className={`mem-chip mem-chip-manual ${isManual ? 'mem-chip-active' : ''}`}
                  onClick={handleManualToggle}
                >
                  ✏️ ระบุเอง
                </button>
              </div>
            )}

            {/* No presets for this type */}
            {filteredPresets.length === 0 && !isManual && (
              <div className="mem-no-presets">
                <span className="mem-no-presets-text">
                  ไม่มีหมวดหมู่สำหรับ{isIncome ? 'รายรับ' : 'รายจ่าย'}
                </span>
                <button
                  type="button"
                  className="mem-chip mem-chip-manual mem-chip-active"
                  onClick={handleManualToggle}
                >
                  ✏️ ระบุเอง
                </button>
              </div>
            )}

            {/* Custom category input */}
            {isManual && (
              <div className="mem-manual-row">
                <input
                  className="input mem-manual-input"
                  placeholder="พิมพ์ชื่อหมวดหมู่..."
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* ── Amount (prominent) ── */}
          <div className="form-group">
            <label className="form-label form-label-required">จำนวนเงิน</label>
            <div className="mem-amount-wrap">
              <input
                ref={amountRef}
                className={`input mem-amount ${isIncome ? 'mem-amount-income' : 'mem-amount-expense'}`}
                type="number"
                placeholder="0"
                min="0"
                step="1"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
              <span className="mem-amount-suffix">฿</span>
            </div>
          </div>

          {/* ── Date & Notes ── */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">วันที่</label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">หมายเหตุ</label>
              <input
                className="input"
                placeholder="(ไม่บังคับ)"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>

          {/* ── Summary preview ── */}
          {parseFloat(form.amount) > 0 && form.category.trim() && (
            <div className={`mem-preview ${isIncome ? 'mem-preview-income' : 'mem-preview-expense'}`}>
              <div className="mem-preview-left">
                <span className="mem-preview-label">{isIncome ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย'}</span>
                <span className="mem-preview-cat">
                  {form.color && <span className="mem-preview-dot" style={{ background: form.color }} />}
                  {form.category}
                </span>
              </div>
              <span className="mem-preview-amount">
                {isIncome ? '+' : '−'}{parseFloat(form.amount).toLocaleString('th-TH')} ฿
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            ยกเลิก
          </button>
          <button
            className={`btn ${isIncome ? 'btn-primary' : 'mem-btn-expense'}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><span className="mem-spinner" /> กำลังบันทึก...</>
            ) : (
              <><FontAwesomeIcon icon={faPlus} /> บันทึก</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
