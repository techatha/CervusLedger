import React, { useState, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faChevronRight,
  faChevronLeft,
  faPlus,
  faMinus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { RecordStockLog } from 'wailsjs/go/handlers/GoldItemHandler'
import { formatShortThaiDate } from '@/utils/thai'
import { getLocalISOString } from '@/utils/date'
import './GoldStockWizard.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'อื่นๆ'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GoldStockWizard({ items, editedAmounts, onClose, onSaved }) {
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardAmounts, setWizardAmounts] = useState(() => ({ ...editedAmounts }))
  const [savingAudit, setSavingAudit] = useState(false)
  const [error, setError] = useState(null)

  const auditGroups = groupBy(items, 'type')
  const typeKeys = Object.keys(auditGroups)
  const today = getLocalISOString()

  const wizardCurrentType = typeKeys[wizardStep]
  const wizardCurrentItems = wizardCurrentType ? auditGroups[wizardCurrentType] : []
  const isLastStep = wizardStep === typeKeys.length - 1

  // ── Amount helpers ──────────────────────────────────────────────────────────
  const getAmount = (id) => parseInt(wizardAmounts[id] ?? '0') || 0

  const setAmount = useCallback((id, val) => {
    const clamped = Math.max(0, val)
    setWizardAmounts(p => ({ ...p, [id]: String(clamped) }))
  }, [])

  const handleInput = (id, raw) => {
    // Allow empty string while typing
    const n = parseInt(raw)
    setWizardAmounts(p => ({ ...p, [id]: isNaN(n) ? '' : String(Math.max(0, n)) }))
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleWizardSave = async () => {
    setSavingAudit(true)
    setError(null)
    try {
      for (const item of items) {
        const amount = getAmount(item.id)
        await RecordStockLog({ gold_item_id: item.id, amount, log_date: today })
      }
      onSaved(wizardAmounts)
    } catch (e) {
      setError('บันทึกสต็อกไม่สำเร็จ: ' + e)
    } finally {
      setSavingAudit(false)
    }
  }

  const handleNext = () => isLastStep ? handleWizardSave() : setWizardStep(s => s + 1)
  const handlePrev = () => setWizardStep(s => s - 1)

  // ── Group total for current step ────────────────────────────────────────────
  const stepTotal = wizardCurrentItems.reduce((s, item) => s + getAmount(item.id), 0)

  return (
    <div className="gsw-backdrop" onClick={onClose}>
      <div className="gsw-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="gsw-header">
          <div className="gsw-header-left">
            <div className="gsw-date-label">บันทึกสต็อกประจำวันที่ {formatShortThaiDate(today)}</div>
            <div className="gsw-type-title">{wizardCurrentType}</div>
            <div className="gsw-type-meta">
              {wizardCurrentItems.length} รายการ · รวม {stepTotal} ชิ้น
            </div>
          </div>
          <button className="gsw-close" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* ── Progress bar + step dots ───────────────────────────── */}
        <div className="gsw-progress-track">
          <div
            className="gsw-progress-fill"
            style={{ width: `${((wizardStep + 1) / typeKeys.length) * 100}%` }}
          />
        </div>

        {/* ── Item rows ─────────────────────────────────────────── */}
        <div className="gsw-body">
          {error && <div className="alert alert-error" style={{ margin: '0 0 16px' }}>{error}</div>}

          <div className="gsw-items">
            {wizardCurrentItems.map((item, idx) => {
              const amt = getAmount(item.id)
              return (
                <div key={item.id} className="gsw-item-row">

                  {/* Item info */}
                  <div className="gsw-item-info">
                    <span className="gsw-item-index">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="gsw-item-text">
                      <div className="gsw-item-name">{item.subtype}</div>
                      {item.weight_grams > 0 && (
                        <div className="gsw-item-weight">{item.weight_grams.toFixed(2)} ก.</div>
                      )}
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="gsw-stepper">
                    <button
                      className="gsw-step-btn gsw-step-minus"
                      onClick={() => setAmount(item.id, amt - 1)}
                      disabled={amt <= 0}
                      aria-label="ลด"
                    >
                      <FontAwesomeIcon icon={faMinus} />
                    </button>

                    <input
                      type="number"
                      min="0"
                      className="gsw-step-input"
                      value={wizardAmounts[item.id] ?? '0'}
                      onChange={e => handleInput(item.id, e.target.value)}
                      onBlur={e => {
                        // Snap to 0 if left blank
                        if (e.target.value === '') setAmount(item.id, 0)
                      }}
                    />

                    <button
                      className="gsw-step-btn gsw-step-plus"
                      onClick={() => setAmount(item.id, amt + 1)}
                      aria-label="เพิ่ม"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer nav ────────────────────────────────────────── */}
        <div className="gsw-footer">
          <button
            className="btn btn-ghost gsw-nav-btn"
            onClick={handlePrev}
            disabled={wizardStep === 0}
          >
            <FontAwesomeIcon icon={faChevronLeft} /> ย้อนกลับ
          </button>

          <div className="gsw-footer-center">
            <div className="gsw-step-dots">
              {typeKeys.map((k, i) => (
                <button
                  key={k}
                  className={`gsw-dot ${i < wizardStep ? 'done' : i === wizardStep ? 'active' : ''}`}
                  onClick={() => setWizardStep(i)}
                  title={k}
                >
                  {i < wizardStep
                    ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: 8 }} />
                    : <span className="gsw-dot-num">{i + 1}</span>
                  }
                </button>
              ))}
            </div>

            {/* ── Type title ────────────────────────────────────────── */}
            <div className="gsw-type-section">
              <div className="gsw-type-eyebrow">ประเภท {wizardStep + 1} / {typeKeys.length}</div>
            </div>
          </div>

          {isLastStep ? (
            <button
              className="btn btn-primary gsw-nav-btn gsw-save-btn"
              onClick={handleWizardSave}
              disabled={savingAudit}
            >
              <FontAwesomeIcon icon={faCheck} />
              {savingAudit ? 'กำลังบันทึก...' : 'บันทึกสต็อกทั้งหมด'}
            </button>
          ) : (
            <button className="btn btn-primary gsw-nav-btn" onClick={handleNext}>
              ถัดไป <FontAwesomeIcon icon={faChevronRight} />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}