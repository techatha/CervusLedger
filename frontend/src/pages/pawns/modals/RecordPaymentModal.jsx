import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartArrowDown } from '@fortawesome/free-solid-svg-icons'
import { formatBaht } from '@/utils/thai'
import { getLocalISOString } from '@/utils/date'
import { getLatestPaidMonth } from '@/utils/pawn'
import '../PrincipalChangeForm.css'

const THAI_MONTHS = [
  '','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

const today = () => getLocalISOString().slice(0, 10)

function IconInfo() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}

export default function RecordPaymentModal({ pawn, payments, customerName, onSaved, onClose }) {
  const navigate = useNavigate()
  
  const latestPaid = getLatestPaidMonth(pawn, payments) || { month: new Date().getMonth(), year: new Date().getFullYear() }
  
  let defaultMonth = latestPaid.month + 2
  let defaultYear = latestPaid.year
  if (defaultMonth > 12) {
    defaultMonth = 1
    defaultYear += 1
  }

  const [form, setForm] = useState({
    month:     defaultMonth,
    year:      defaultYear,
    paid_date: today(),
    notes:     '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const selectedMonthIndex = parseInt(form.month) - 1
  const selectedYear = parseInt(form.year)
  const monthsDiff = (selectedYear - latestPaid.year) * 12 + (selectedMonthIndex - latestPaid.month)

  const generateMonths = () => {
    const arr = []
    for (let i = 1; i <= monthsDiff; i++) {
       let m = latestPaid.month + i
       let y = latestPaid.year
       while (m > 11) {
         m -= 12
         y += 1
       }
       arr.push({ month: m + 1, year: y })
    }
    return arr
  }

  const targetMonths = monthsDiff > 0 ? generateMonths() : []

  const handleSave = () => {
    let itemsToProcess = targetMonths
    if (itemsToProcess.length === 0) {
      itemsToProcess = [{ month: parseInt(form.month), year: parseInt(form.year) }]
    }
    
    const ticketNo = String(pawn.ticket_number).padStart(4, '0')
    const totalAmount = pawn.interest_amount * itemsToProcess.length
    
    let monthLabels = ''
    if (itemsToProcess.length > 2) {
      const first = itemsToProcess[0]
      const last = itemsToProcess[itemsToProcess.length - 1]
      monthLabels = `${THAI_MONTHS[first.month]} ${first.year + 543} ถึง ${THAI_MONTHS[last.month]} ${last.year + 543}`
    } else {
      monthLabels = itemsToProcess.map(m => `${THAI_MONTHS[m.month]} ${m.year + 543}`).join(', ')
    }

    const combinedItem = {
      type: 'pawn_interest',
      label: `ชำระดอกเบี้ยจำนำ`,
      weight_baht: 0,
      price_per_baht: 0,
      total_amount: totalAmount,
      
      payments: itemsToProcess.map(m => {
        const monthLabel = THAI_MONTHS[m.month]
        return {
          pawn_record_id:  pawn.id,
          month:           m.month,
          year:            m.year,
          paid_date:       form.paid_date,
          notes:           `งวด ${monthLabel} ${m.year + 543}${form.notes ? ` | ${form.notes}` : ''}`,
          interest_amount: pawn.interest_amount,
          customer_name:   customerName || '',
          ticket_number:   pawn.ticket_number,
        }
      }),
      
      notes: `ตั๋ว #${ticketNo} (${customerName || pawn.customer_name}) - งวด ${monthLabels}${form.notes ? ` | ${form.notes}` : ''}`,
    }

    onClose()
    navigate('/sales', { state: { addItems: [combinedItem] } })
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
              <span>ดอกเบี้ย (ต่อเดือน)</span>
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

          {targetMonths.length > 1 && (
            <div className="pm-auto-note" style={{ marginTop: '8px', color: 'var(--blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '6px' }}>
              <IconInfo />
              ระบบจะเพิ่มรายการชำระดอกเบี้ยที่ค้างตั้งแต่เดือนล่าสุดจนถึงเดือนที่เลือก (รวม {targetMonths.length} เดือน) ลงในตะกร้าอัตโนมัติ
            </div>
          )}

          <div className="form-row form-row-2" style={{ marginTop: '16px' }}>
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
            รวมดอกเบี้ยที่ต้องชำระ {formatBaht(pawn.interest_amount * (targetMonths.length || 1))} จะถูกนำไปคำนวณในตะกร้า
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <FontAwesomeIcon icon={faCartArrowDown} /> เพิ่มลงตะกร้า ({targetMonths.length || 1} เดือน)
          </button>
        </div>
      </div>
    </div>
  )
}
