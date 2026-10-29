import { useState } from 'react'
import { UpdatePawnInfo } from 'wailsjs/go/pawn_handler/PawnHandler'

export default function EditPawnInfoModal({ pawn, onSaved, onClose }) {
  const [ticketNumber, setTicketNumber] = useState(pawn.ticket_number)
  const [pawnedDate, setPawnedDate] = useState(pawn.pawned_date ? pawn.pawned_date.slice(0, 10) : '')
  const [itemType, setItemType] = useState(pawn.item_type || '')
  const [weightGrams, setWeightGrams] = useState(pawn.weight_grams || '')
  const [description, setDescription] = useState(pawn.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    const ticketNum = Number.parseInt(ticketNumber, 10)
    if (Number.isNaN(ticketNum) || ticketNum <= 0) {
      setError('กรุณากรอกเลขที่ตั๋วให้ถูกต้อง')
      return
    }
    const weight = Number.parseFloat(weightGrams)
    if (Number.isNaN(weight) || weight < 0) {
      setError('กรุณากรอกน้ำหนักให้ถูกต้อง')
      return
    }
    if (!pawnedDate) {
      setError('กรุณาเลือกวันที่จำนำ')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await UpdatePawnInfo(pawn.id, ticketNum, pawnedDate, itemType, weight, description)
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" tabIndex={-1} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
      <div className="modal" style={{ width: 450 }}>
        <div className="modal-header">
          <div className="modal-title">แก้ไขข้อมูลตั๋วจำนำ</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="epim-ticket-number">เลขที่ตั๋ว</label>
            <input
              id="epim-ticket-number" className="input"
              type="number"
              value={ticketNumber}
              onChange={e => setTicketNumber(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label form-label-required" htmlFor="epim-pawned-date">วันที่จำนำ</label>
            <input
              id="epim-pawned-date" className="input"
              type="date"
              value={pawnedDate}
              onChange={e => setPawnedDate(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-row form-row-2" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="epim-item-type">ประเภทสินค้า</label>
              <input
                id="epim-item-type" className="input"
                type="text"
                placeholder="เช่น สร้อยคอ, แหวน"
                value={itemType}
                onChange={e => setItemType(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="epim-weight-grams">น้ำหนัก (กรัม)</label>
              <input
                id="epim-weight-grams" className="input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={weightGrams}
                onChange={e => setWeightGrams(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="epim-description">รายละเอียดสินค้า</label>
            <textarea
              id="epim-description" className="input"
              rows="3"
              placeholder="รายละเอียดเพิ่มเติม..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={saving}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
