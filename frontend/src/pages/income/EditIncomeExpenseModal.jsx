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
  faBan,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons'
import { formatBaht } from '@/utils/thai'
import './ManualEntryModal.css'
import './EditIncomeExpenseModal.css'

export default function EditIncomeExpenseModal({ entry, startEditable, onSaved, onClose, onRequestCancel }) {
  const isCancelled = entry.status === 'cancelled'
  const [isEditable, setIsEditable] = useState(isCancelled ? false : (startEditable || false))
  const [form, setForm] = useState({
    notes: entry.notes || '',
    isBankTransfer: entry.is_bank_transfer || false,
    amount: entry.amount || '',
    category: entry.category || '',
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
        amount: Number.parseFloat(form.amount) || 0.0,
        category: form.category || '',
      })
      onSaved()
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !saving) void handleSave(); else if (e.key === 'Escape') onClose()
  }

  const isIncome = entry.type === 'income'

  return (
    <div className="modal-backdrop mem-backdrop" role="dialog" aria-modal="true" tabIndex={-1} onClick={(e) => { if (e.target === e.currentTarget)onClose()}} onKeyDown={handleKeyDown}>
      <div className="modal mem-modal">

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

          {/* ── Preview card: Read-only or Editable ── */}
          {!isEditable ? (
            <div className={`mem-preview mem-preview-readonly ${isIncome ? 'mem-preview-income' : 'mem-preview-expense'}`} style={{ position: 'relative', minHeight: '60px' }}>
              <div className="mem-preview-left">
                <span className="mem-preview-label">
                  <FontAwesomeIcon icon={faLock} /> {isIncome ? 'รายรับ' : 'รายจ่าย'} · รายการนี้แก้ไขไม่ได้
                </span>
                <span className="mem-preview-cat">
                  {entry.color && <span className="mem-preview-dot" style={{ background: entry.color }} />}
                  {entry.category}
                </span>
              </div>
              <span className="mem-preview-amount" style={{ marginRight: '110px' }}>
                {isIncome ? '+' : '−'}{formatBaht(entry.amount)}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', border: '1px solid var(--border)' }}
                onClick={() => setIsEditable(true)}
                title="แก้ไขจำนวนและหมวดหมู่"
              >
                <FontAwesomeIcon icon={faPenToSquare} /> แก้ไขข้อมูล
              </button>
              {isCancelled && (
                <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                   <span className="badge" style={{ background: '#fff', border: '1px solid var(--red)', color: 'var(--red)', fontSize: 13, padding: '4px 10px', boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)' }}>
                     <FontAwesomeIcon icon={faBan} style={{ marginRight: 6 }} />ยกเลิกแล้ว
                   </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-hover)', padding: '14px', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label-required" htmlFor="edit-modal-category" style={{ fontSize: '12px', marginBottom: '4px' }}>หมวดหมู่</label>
                <input
                  id="edit-modal-category" className="input"
                  placeholder="ระบุหมวดหมู่..."
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label-required" htmlFor="edit-modal-amount" style={{ fontSize: '12px', marginBottom: '4px' }}>จำนวนเงิน</label>
                <div className="mem-amount-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="edit-modal-amount" className={`input mem-amount ${isIncome ? 'mem-amount-income' : 'mem-amount-expense'}`}
                    type="number"
                    step="any"
                    placeholder="0"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: '20px', fontWeight: 'bold' }}
                    required
                  />
                  <span className="mem-amount-suffix" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>฿</span>
                </div>
              </div>
            </div>
          )}
          <div className="eiem-meta-row">
            <span className="eiem-meta-item">
              <FontAwesomeIcon icon={faCalendarDays} />
              {entry.date ? entry.date.slice(0, 10) : '—'}
            </span>
            <span className={`badge eiem-source-badge ${entry.source === 'auto' ? 'badge-blue' : 'badge-amber'}`}>
              <FontAwesomeIcon icon={entry.source === 'auto' ? faRobot : faPenToSquare} />
              {entry.source === 'auto' ? 'อัตโนมัติ' : 'บันทึกเอง'}
            </span>
            {entry.transaction_id && (
              <span className="eiem-meta-item" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Ref: {entry.transaction_id}
              </span>
            )}
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
            <label className="form-label" htmlFor="edit-modal-notes">หมายเหตุ</label>
            <textarea
              ref={notesRef}
              id="edit-modal-notes" className="input eiem-notes-textarea"
              placeholder="เพิ่มหมายเหตุ... (ไม่บังคับ)"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              disabled={isCancelled}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {!isCancelled && entry.source === 'auto' && entry.transaction_id && (
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--red)' }}
                onClick={() => {
                  onRequestCancel(entry)
                  onClose()
                }}
              >
                <FontAwesomeIcon icon={faBan} style={{ marginRight: 4 }} />
                ยกเลิกรายการ
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
    </div>
  )
}