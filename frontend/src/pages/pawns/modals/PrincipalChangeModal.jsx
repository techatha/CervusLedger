import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GetPawnSettings } from 'wailsjs/go/pawn_handler/PawnHandler'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartArrowDown } from '@fortawesome/free-solid-svg-icons'
import { formatBaht } from '@/utils/thai'
import { getLocalISOString } from '@/utils/date'
import '../PrincipalChangeForm.css'

const today = () => getLocalISOString().slice(0, 10)

export default function PrincipalChangeModal({ pawn, onSaved, onClose }) {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({
    change_type: 'reduction',
    amount:      '',
    date:        today(),
    notes:       '',
  })
  const [preview, setPreview] = useState({ newPrincipal: 0, newRate: 0, newAmount: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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

  const navigate = useNavigate()

  const handleSave = () => {
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setError('กรุณากรอกจำนวนเงิน'); return }
    if (preview.newPrincipal < 0) { setError('ต้นเงินติดลบ'); return }
    
    const ticketNo = String(pawn.ticket_number).padStart(4, '0')
    const customerName = pawn.customer_name || 'ลูกค้า'
    const typeLabel = form.change_type === 'reduction' ? 'ลดต้นจำนำ' : 'เพิ่มต้นจำนำ'
    
    const combinedItem = {
      type: 'pawn_principal_change',
      label: typeLabel,
      weight_baht: 0,
      price_per_baht: 0,
      total_amount: amt,
      
      pawn_record_id:      pawn.id,
      date:                form.date || getLocalISOString().slice(0, 10),
      change_type:         form.change_type,
      amount:              amt,
      new_principal:       preview.newPrincipal,
      new_interest_rate:   preview.newRate,
      new_interest_amount: preview.newAmount,
      original_notes:      form.notes,
      
      notes: `ตั๋ว #${ticketNo} (${customerName}) - ${typeLabel}${form.notes ? ` | ${form.notes}` : ''}`,
    }

    onClose()
    navigate('/sales', { state: { addItems: [combinedItem] } })
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
            <FontAwesomeIcon icon={faCartArrowDown} /> เพิ่มลงตะกร้า
          </button>
        </div>
      </div>
    </div>
  )
}
