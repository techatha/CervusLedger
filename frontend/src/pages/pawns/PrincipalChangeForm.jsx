// ─── RecordPaymentModal ───────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RecordPayment } from 'wailsjs/go/handlers/PawnHandler'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartArrowDown } from '@fortawesome/free-solid-svg-icons'
import { formatBaht } from '@/utils/thai'
import './PrincipalChangeForm.css'

const THAI_MONTHS = [
  '','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

const today = () => new Date().toISOString().slice(0, 10)
const nowCE  = new Date()

export function RecordPaymentModal({ pawn, customerName, onSaved, onClose }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    month:     nowCE.getMonth() + 1,
    year:      nowCE.getFullYear(),
    paid_date: today(),
    notes:     '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    const monthVal = parseInt(form.month)
    const yearVal = parseInt(form.year)
    const ticketNo = String(pawn.ticket_number).padStart(4, '0')
    const monthLabel = THAI_MONTHS[monthVal]

    const itemToAdd = {
      type: 'pawn_interest',
      label: `ดอกเบี้ยตั๋ว #${ticketNo} — งวด ${monthLabel} ${yearVal + 543}`,
      weight_baht: 0,
      price_per_baht: 0,
      total_amount: pawn.interest_amount,
      
      // fields for RecordPayment API
      pawn_record_id:  pawn.id,
      month:           monthVal,
      year:            yearVal,
      paid_date:       form.paid_date,
      notes:           form.notes,
      interest_amount: pawn.interest_amount,
      customer_name:   customerName || '',
      ticket_number:   pawn.ticket_number,
    }

    onClose()
    navigate('/sales', { state: { addItems: [itemToAdd] } })
  }

  const beYear = parseInt(form.year) + 543

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pm-payment-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">บันทึกการจ่ายดอกเบี้ย</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error pm-modal-error">{error}</div>}
        <div className="modal-body">

          {/* Info strip */}
          <div className="pm-info-strip ">
            <div className="pm-info-row">
              <span>หมายเลขตั๋ว</span>
              <strong># {String(pawn.ticket_number).padStart(4,'0')}</strong>
            </div>
            <div className="pm-info-row">
              <span>ดอกเบี้ย</span>
              <strong className="pm-gold-text">{formatBaht(pawn.interest_amount)}</strong>
            </div>
          </div>

          {/* Month / Year */}
          <div className="form-row form-row-2 pm-mt-16">
            <div className="form-group">
              <label className="form-label">เดือน</label>
              <select className="input" value={form.month} onChange={e => set('month', e.target.value)}>
                {THAI_MONTHS.slice(1).map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ปี (พ.ศ.)</label>
              <input
                className="input"
                type="number"
                value={beYear}
                onChange={e => set('year', parseInt(e.target.value) - 543)}
              />
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">วันที่จ่าย</label>
              <input
                className="input"
                type="date"
                value={form.paid_date}
                onChange={e => set('paid_date', e.target.value)}
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

          <div className="pm-auto-note">
            <IconInfo />
            ดอกเบี้ย {formatBaht(pawn.interest_amount)} จะถูกบันทึกเป็นรายรับอัตโนมัติ
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <FontAwesomeIcon icon={faCartArrowDown} /> ชำระเงิน
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PrincipalChangeForm ─────────────────────────────────────────────────
import { useEffect } from 'react'
import { AddPrincipalChange, GetPawnSettings } from 'wailsjs/go/handlers/PawnHandler'

export function PrincipalChangeForm({ pawn, onSaved, onClose }) {
  const [settings,   setSettings]   = useState(null)
  const [form, setForm] = useState({
    change_type: 'reduction',
    amount:      '',
    date:        today(),
    notes:       '',
  })
  const [preview, setPreview] = useState({ newPrincipal: 0, newRate: 0, newAmount: 0 })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    GetPawnSettings().then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    if (!settings || !form.amount) { setPreview({ newPrincipal: 0, newRate: 0, newAmount: 0 }); return }
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) return
    const current = pawn.current_principal ?? pawn.initial_principal
    const np = form.change_type === 'reduction' ? current - amt : current + amt
    if (np < 0) { setPreview({ newPrincipal: 0, newRate: 0, newAmount: 0 }); return }
    const rate   = np < settings.Threshold ? settings.LowRate : settings.HighRate
    const amount = Math.max(np * rate / 100, settings.MinInterest)
    setPreview({ newPrincipal: np, newRate: rate, newAmount: amount })
  }, [form.change_type, form.amount, settings, pawn])

  const handleSave = async () => {
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setError('กรุณากรอกจำนวนเงิน'); return }
    if (preview.newPrincipal < 0) { setError('ต้นเงินติดลบ'); return }
    setSaving(true)
    setError(null)
    try {
      await AddPrincipalChange({
        pawn_record_id:      pawn.id,
        date:                new Date().toISOString().slice(0, 7),
        change_type:         form.change_type,
        amount:              amt,
        new_principal:       preview.newPrincipal,
        new_interest_rate:   preview.newRate,
        new_interest_amount: preview.newAmount,
        notes:               form.notes,
      })
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const current = pawn.current_principal ?? pawn.initial_principal

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pm-change-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">เปลี่ยนแปลงต้นเงิน</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error pm-modal-error">{error}</div>}
        <div className="modal-body">

          <div className="pm-info-strip">
            <div className="pm-info-row">
              <span>ต้นเงินปัจจุบัน</span>
              <strong>{formatBaht(current)}</strong>
            </div>
          </div>

          <div className="form-row form-row-2 pm-mt-16">
            <div className="form-group">
              <label className="form-label">ประเภท</label>
              <select className="input" value={form.change_type} onChange={e => set('change_type', e.target.value)}>
                <option value="reduction">ลดต้น</option>
                <option value="increase">เพิ่มต้น</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label form-label-required">จำนวนเงิน (บาท)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                min="1"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="form-row form-row-1">
            <div className="form-group">
              <label className="form-label">หมายเหตุ</label>
              <input className="input" placeholder="(ไม่บังคับ)" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Preview */}
          {preview.newPrincipal > 0 && (
            <div className="npf-preview">
              <div className="npf-preview-row">
                <span className="npf-preview-label">ต้นเงินใหม่</span>
                <span className="npf-preview-amount">{formatBaht(preview.newPrincipal)}</span>
              </div>
              <div className="npf-preview-row pm-preview-row-border">
                <span className="npf-preview-label">ดอกเบี้ยใหม่/เดือน</span>
                <span className="npf-preview-val" >
                  {formatBaht(preview.newAmount)}
                  <span className="npf-preview-note"> ({preview.newRate}%)</span>
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !settings}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IconInfo() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
