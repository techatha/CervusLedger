import { useState } from 'react'
import { CreateIncomeExpense } from 'wailsjs/go/handlers/SaleHandler'

const today = () => new Date().toISOString().slice(0, 10)

const INCOME_CATS  = ['ดอกเบี้ยจำนำ', 'ขายทอง', 'ค่าบริการ', 'อื่นๆ']
const EXPENSE_CATS = ['รับซื้อทอง', 'ค่าเช่า', 'ค่าสาธารณูปโภค', 'เงินเดือน', 'ค่าใช้จ่ายทั่วไป', 'อื่นๆ']

export default function ManualEntryModal({ onSaved, onClose }) {
  const [form, setForm] = useState({
    type:     'income',
    category: '',
    amount:   '',
    notes:    '',
    date:     today(),
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  const handleTypeChange = (t) => {
    setForm(p => ({ ...p, type: t, category: '' }))
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
        type:     form.type,
        category: form.category,
        amount:   parseFloat(form.amount),
        notes:    form.notes,
        date:     form.date,
      })
      onSaved()
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  const isIncome = form.type === 'income'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>

        {/* Type toggle header */}
        <div className="mem-type-header">
          <button
            className={`mem-type-btn ${isIncome ? 'mem-type-income' : ''}`}
            onClick={() => handleTypeChange('income')}
          >
            รายรับ
          </button>
          <button
            className={`mem-type-btn ${!isIncome ? 'mem-type-expense' : ''}`}
            onClick={() => handleTypeChange('expense')}
          >
            รายจ่าย
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Category chips */}
          <div className="form-group">
            <label className="form-label form-label-required">หมวดหมู่</label>
            <div className="mem-cat-chips">
              {cats.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`gf-type-chip ${form.category === c ? 'gf-type-chip-active' : ''}`}
                  onClick={() => set('category', c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="หรือพิมพ์หมวดหมู่เอง..."
              value={form.category}
              onChange={e => set('category', e.target.value)}
            />
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label form-label-required">จำนวนเงิน (บาท)</label>
              <input
                className="input mem-amount"
                type="number"
                placeholder="0"
                min="0"
                step="1"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">วันที่</label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
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

          {/* Amount preview */}
          {parseFloat(form.amount) > 0 && (
            <div className={`mem-preview ${isIncome ? 'mem-preview-income' : 'mem-preview-expense'}`}>
              <span>{isIncome ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย'}</span>
              <span className="mem-preview-amount">
                {parseFloat(form.amount).toLocaleString('th-TH')} ฿
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button
            className="btn btn-primary"
            style={!isIncome ? { background:'var(--red)', color:'#fff' } : {}}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
