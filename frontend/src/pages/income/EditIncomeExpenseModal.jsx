import { useState, useEffect, useRef } from 'react'
import { UpdateIncomeExpense } from 'wailsjs/go/income_expense_handler/IncomeExpenseHandler'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPenToSquare,
  faBuildingColumns,
  faArrowTrendUp,
  faArrowTrendDown,
  faLock,
  faCalendarDays,
  faRobot,
} from '@fortawesome/free-solid-svg-icons'
import { formatBaht } from '@/utils/thai'
import './ManualEntryModal.css'
import './EditIncomeExpenseModal.css'

export default function EditIncomeExpenseModal({ entry, onSaved, onClose }) {
  const [form, setForm] = useState({
    notes: entry.notes || '',
    isBankTransfer: entry.is_bank_transfer || false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const notesRef = useRef(null)

  useEffect(() => {
    if (notesRef.current) notesRef.current.focus()
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await UpdateIncomeExpense(entry.id, {
        notes: form.notes,
        is_bank_transfer: form.isBankTransfer,
      })
      onSaved()
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !saving) handleSave()
  }

  const isIncome = entry.type === 'income'

  return (
    <div className="modal-backdrop mem-backdrop" onClick={onClose}>
      <div className="modal mem-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>

        <div className="modal-header">
          <div className="modal-title">
            <FontAwesomeIcon
              icon={isIncome ? faArrowTrendUp : faArrowTrendDown}
              style={{ color: isIncome ? 'var(--green)' : 'var(--red)' }}
            />{' '}
            แก้ไข{isIncome ? 'รายรับ' : 'รายจ่าย'}
          </div>
          <button className="modal-close" onClick={onClose} title="ปิด">✕</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error mem-error-shake">
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── Read-only preview (locked fields) ── */}
          <div className={`mem-preview mem-preview-readonly ${isIncome ? 'mem-preview-income' : 'mem-preview-expense'}`}>
            <div className="mem-preview-left">
              <span className="mem-preview-label">
                <FontAwesomeIcon icon={faLock} /> {isIncome ? 'รายรับ' : 'รายจ่าย'} · รายการนี้แก้ไขไม่ได้
              </span>
              <span className="mem-preview-cat">
                {entry.color && <span className="mem-preview-dot" style={{ background: entry.color }} />}
                {entry.category}
              </span>
            </div>
            <span className="mem-preview-amount">
              {isIncome ? '+' : '−'}{formatBaht(entry.amount)}
            </span>
          </div>

          {/* ── Meta row: date + source badge (same colors as list page) ── */}
          <div className="eiem-meta-row">
            <span className="eiem-meta-item">
              <FontAwesomeIcon icon={faCalendarDays} />
              {entry.date ? entry.date.slice(0, 10) : '—'}
            </span>
            <span className={`badge eiem-source-badge ${entry.source === 'auto' ? 'badge-blue' : 'badge-amber'}`}>
              <FontAwesomeIcon icon={entry.source === 'auto' ? faRobot : faPenToSquare} />
              {entry.source === 'auto' ? 'อัตโนมัติ' : 'บันทึกเอง'}
            </span>
          </div>

          {/* ── Bank transfer toggle (editable, boxed) ── */}
          <label className={`eiem-bank-toggle ${form.isBankTransfer ? 'eiem-bank-toggle-active' : ''}`}>
            <input
              type="checkbox"
              checked={form.isBankTransfer}
              onChange={e => set('isBankTransfer', e.target.checked)}
              className="eiem-bank-checkbox"
            />
            <span className="eiem-bank-icon-wrap">
              <FontAwesomeIcon icon={faBuildingColumns} />
            </span>
            <span className="eiem-bank-text">
              <span className="eiem-bank-title">รับ/จ่ายผ่านช่องทางธนาคาร (โอน)</span>
              <span className="eiem-bank-sub">
                เมื่อเลือก รายการนี้จะแสดงไอคอน <FontAwesomeIcon icon={faBuildingColumns} className="eiem-bank-sub-icon" /> ในหน้ารายการ
              </span>
            </span>
          </label>

          {/* ── Editable notes ── */}
          <div className="form-group">
            <label className="form-label">หมายเหตุ</label>
            <textarea
              ref={notesRef}
              className="input eiem-notes-textarea"
              placeholder="เพิ่มหมายเหตุ... (ไม่บังคับ)"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

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
              <><FontAwesomeIcon icon={faPenToSquare} /> บันทึกการแก้ไข</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}