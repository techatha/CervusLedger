import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { RecordStockLog } from 'wailsjs/go/handlers/GoldItemHandler'

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'อื่นๆ'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export default function GoldStockWizard({
  selectedMonth,
  stockLogs,
  editedAmounts,
  onClose,
  onSaved,
}) {
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardAmounts, setWizardAmounts] = useState(() => ({ ...editedAmounts }))
  const [savingAudit, setSavingAudit] = useState(false)
  const [error, setError] = useState(null)

  const auditGroups = groupBy(stockLogs, 'type')
  const typeKeys = Object.keys(auditGroups)

  const wizardCurrentType = typeKeys[wizardStep]
  const wizardCurrentLogs = wizardCurrentType ? auditGroups[wizardCurrentType] : []
  const isLastStep = wizardStep === typeKeys.length - 1

  const handleWizardAmountChange = (goldItemId, val) => {
    setWizardAmounts(p => ({ ...p, [goldItemId]: val }))
  }

  const handleWizardSave = async () => {
    setSavingAudit(true)
    setError(null)
    try {
      const logDate = `${selectedMonth}-01`
      for (const log of stockLogs) {
        const amount = parseInt(wizardAmounts[log.gold_item_id] ?? editedAmounts[log.gold_item_id]) || 0
        await RecordStockLog({ gold_item_id: log.gold_item_id, amount, log_date: logDate })
      }
      onSaved(wizardAmounts)
    } catch (e) {
      setError('บันทึกสต็อกไม่สำเร็จ: ' + e)
    } finally {
      setSavingAudit(false)
    }
  }

  const handleWizardNext = () => {
    if (isLastStep) {
      handleWizardSave()
    } else {
      setWizardStep(s => s + 1)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal gl-wizard-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">บันทึกสต็อกประจำเดือน {selectedMonth}</div>
            <div className="gl-wizard-progress-label">
              ประเภท {wizardStep + 1} / {typeKeys.length}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="gl-wizard-progress-bar">
          {typeKeys.map((k, i) => (
            <div
              key={k}
              className={`gl-wizard-progress-seg ${i < wizardStep ? 'done' : i === wizardStep ? 'active' : ''}`}
              onClick={() => setWizardStep(i)}
              title={k}
            />
          ))}
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Editorial type title inside wizard too */}
          <div className="gl-wizard-type-title">{wizardCurrentType}</div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table gl-table">
              <thead>
                <tr>
                  <th>รุ่น / น้ำหนัก</th>
                  <th style={{ textAlign: 'right', width: 140 }}>จำนวน (ชิ้น)</th>
                </tr>
              </thead>
              <tbody>
                {wizardCurrentLogs.map(log => {
                  const amtStr = wizardAmounts[log.gold_item_id] ?? '0'
                  return (
                    <tr key={log.gold_item_id}>
                      <td style={{ fontWeight: 600 }}>{log.subtype}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          className="input gl-audit-input-amount"
                          value={amtStr}
                          placeholder="0"
                          onChange={e => handleWizardAmountChange(log.gold_item_id, e.target.value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          {wizardStep > 0 && (
            <button className="btn btn-ghost" onClick={() => setWizardStep(s => s - 1)}>
              ← ย้อนกลับ
            </button>
          )}
          <div style={{ flex: 1 }} />
          {isLastStep ? (
            <button
              className="btn btn-primary gl-btn-save"
              onClick={handleWizardSave}
              disabled={savingAudit}
            >
              <FontAwesomeIcon icon={faCheck} />
              {savingAudit ? 'กำลังบันทึก...' : 'บันทึกสต็อกทั้งหมด'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleWizardNext}>
              ประเภทถัดไป <FontAwesomeIcon icon={faChevronRight} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
