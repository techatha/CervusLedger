import { useState, useEffect, useRef } from 'react'
import {
  GetPawnSettings,
  CreatePawn,
} from 'wailsjs/go/handlers/PawnHandler'
import { GetCustomers } from 'wailsjs/go/handlers/CustomerHandler'
import { formatBaht, fullName } from '@/utils/thai'
import './NewPawnForm.css'

const today = () => new Date().toISOString().slice(0, 10)

export default function NewPawnForm({ onSaved, onClose }) {
  const [settings,   setSettings]   = useState(null)
  const [customers,  setCustomers]  = useState([])
  const [custSearch, setCustSearch] = useState('')
  const [showDrop,   setShowDrop]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)
  const dropRef = useRef(null)

  const [form, setForm] = useState({
    customer_id:    0,
    customer_label: '',
    item_type:      '',
    weight_grams:   '',
    description:    '',
    pawned_date:    today(),
    initial_principal: '',
  })

  // Calculated from principal + settings
  const [preview, setPreview] = useState({ rate: 0, amount: 0 })

  useEffect(() => {
    GetPawnSettings().then(s => {
      setSettings(s)
    }).catch(() => {})
  }, [])

  // Recalculate interest whenever principal or settings change
  useEffect(() => {
    if (!settings || !form.initial_principal) {
      setPreview({ rate: 0, amount: 0 })
      return
    }
    const p = parseFloat(form.initial_principal)
    if (isNaN(p) || p <= 0) { setPreview({ rate: 0, amount: 0 }); return }
    const rate   = p < settings.Threshold ? settings.LowRate : settings.HighRate
    const amount = Math.max(p * rate / 100, settings.MinInterest)
    setPreview({ rate, amount })
  }, [form.initial_principal, settings])

  // Customer autocomplete
  useEffect(() => {
    if (!custSearch) { setCustomers([]); return }
    const t = setTimeout(() => {
      GetCustomers(custSearch).then(d => setCustomers(d || []))
    }, 200)
    return () => clearTimeout(t)
  }, [custSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const selectCustomer = (c) => {
    set('customer_id', c.id)
    set('customer_label', fullName(c))
    setCustSearch(fullName(c))
    setShowDrop(false)
    setCustomers([])
  }

  // Handle auto-selection from smart card events (insertion or registration)
  useEffect(() => {
    const handleSmartcardSelect = (e) => {
      const c = e.detail?.customer
      if (c) {
        console.log('[NewPawnForm] Smartcard selection event triggered for customer:', c)
        const name = fullName(c)
        setForm(prev => ({
          ...prev,
          customer_id: c.id,
          customer_label: name
        }))
        setCustSearch(name)
        setShowDrop(false)
        setCustomers([])
      }
    }
    window.addEventListener('smartcard-pawn-select', handleSmartcardSelect)
    return () => window.removeEventListener('smartcard-pawn-select', handleSmartcardSelect)
  }, [])

  const validate = () => {
    if (!form.customer_id)         return 'กรุณาเลือกลูกค้า'
    if (!form.item_type.trim())    return 'กรุณากรอกประเภทรายการ'
    if (!form.pawned_date)         return 'กรุณากรอกวันจำนำ'
    const p = parseFloat(form.initial_principal)
    if (!p || p <= 0)              return 'กรุณากรอกจำนวนเงินต้น'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError(null)
    try {
      await CreatePawn({
        customer_id:          form.customer_id,
        item_type:            form.item_type,
        weight_grams:         parseFloat(form.weight_grams) || 0,
        description:          form.description,
        pawned_date:          form.pawned_date,
        initial_principal:    parseFloat(form.initial_principal),
        monthly_interest_rate: preview.rate,
        interest_amount:      preview.amount,
      })
      onSaved()
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal npf-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">รับจำนำใหม่</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* ── ลูกค้า ── */}
          <div className="section-divider">ลูกค้า</div>
          <div className="form-group" style={{ position: 'relative' }} ref={dropRef}>
            <label className="form-label form-label-required">ชื่อลูกค้า</label>
            <input
              className="input"
              placeholder="พิมพ์ชื่อหรือเบอร์โทรเพื่อค้นหา..."
              value={custSearch}
              onChange={e => {
                setCustSearch(e.target.value)
                set('customer_id', 0)
                set('customer_label', '')
                setShowDrop(true)
              }}
              onFocus={() => custSearch && setShowDrop(true)}
              autoFocus
            />
            {form.customer_id > 0 && (
              <div className="npf-cust-selected">
                <IconCheck /> เลือกแล้ว: {form.customer_label}
              </div>
            )}
            {showDrop && customers.length > 0 && (
              <div className="npf-dropdown">
                {customers.map(c => (
                  <div
                    key={c.id}
                    className="npf-drop-item"
                    onMouseDown={() => selectCustomer(c)}
                  >
                    <span className="npf-drop-name">{fullName(c)}</span>
                    {c.phone && <span className="npf-drop-phone">{c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── รายการจำนำ ── */}
          <div className="section-divider">รายการที่จำนำ</div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label form-label-required">ประเภท</label>
              <input
                className="input"
                placeholder="เช่น สร้อยคอ, แหวน, ทองแท่ง"
                value={form.item_type}
                onChange={e => set('item_type', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">น้ำหนัก (กรัม)</label>
              <input
                className="input"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.weight_grams}
                onChange={e => set('weight_grams', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">รายละเอียดเพิ่มเติม</label>
            <input
              className="input"
              placeholder="ลักษณะ, ยี่ห้อ, เครื่องหมาย..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* ── เงื่อนไข ── */}
          <div className="section-divider">เงื่อนไข</div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label form-label-required">วันที่จำนำ</label>
              <input
                className="input"
                type="date"
                value={form.pawned_date}
                onChange={e => set('pawned_date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label-required">เงินต้น (บาท)</label>
              <input
                className="input npf-principal"
                type="number"
                placeholder="0"
                min="0"
                step="100"
                value={form.initial_principal}
                onChange={e => set('initial_principal', e.target.value)}
              />
            </div>
          </div>

          {/* Interest Preview */}
          {preview.amount > 0 && (
            <div className="npf-preview">
              <div className="npf-preview-row">
                <span className="npf-preview-label">อัตราดอกเบี้ย</span>
                <span className="npf-preview-val">
                  {preview.rate}% ต่อเดือน
                  {parseFloat(form.initial_principal) < (settings?.Threshold || 10000)
                    ? <span className="npf-preview-note"> (ต้นต่ำกว่า {(settings?.Threshold || 10000).toLocaleString()})</span>
                    : <span className="npf-preview-note"> (ต้นตั้งแต่ {(settings?.Threshold || 10000).toLocaleString()})</span>
                  }
                </span>
              </div>
              <div className="npf-preview-row npf-preview-total">
                <span className="npf-preview-label">ดอกเบี้ยต่อเดือน</span>
                <span className="npf-preview-amount">{formatBaht(preview.amount)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !settings}>
            {saving ? 'กำลังบันทึก...' : 'รับจำนำ'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IconCheck() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
}

