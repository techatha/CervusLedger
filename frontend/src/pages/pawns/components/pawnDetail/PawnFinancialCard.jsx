import React, { useState } from 'react'
import { formatBaht } from '@/utils/thai'
import { UpdatePawnInterest } from 'wailsjs/go/pawn_handler/PawnHandler'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

function PdRow({ label, value }) {
  return (
    <div className="pd-row">
      <span className="pd-row-label">{label}</span>
      <span className="pd-row-value">{value}</span>
    </div>
  )
}

export default function PawnFinancialCard({ pawn, isActive, onReload, onError }) {
  const current = pawn.current_principal ?? pawn.initial_principal

  const [editing, setEditing] = useState(false)
  const [editRate, setEditRate] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const handleEdit = () => {
    setEditRate(String(pawn.monthly_interest_rate))
    setEditAmount(String(pawn.interest_amount))
    setEditing(false) // Reset first
    setEditing(true)
  }

  const handleRateChange = (e) => {
    const newRate = e.target.value
    setEditRate(newRate)
    const parsedRate = parseFloat(newRate)
    if (!isNaN(parsedRate) && parsedRate >= 0) {
      const newAmt = Math.round(current * parsedRate / 100)
      setEditAmount(String(newAmt))
    }
  }

  const handleSave = async () => {
    const rate = parseFloat(editRate)
    const amt = parseFloat(editAmount)
    if (isNaN(rate) || rate < 0) {
      if (onError) onError('อัตราดอกเบี้ยไม่ถูกต้อง')
      return
    }
    if (isNaN(amt) || amt < 0) {
      if (onError) onError('จำนวนดอกเบี้ยไม่ถูกต้อง')
      return
    }

    setSaving(true)
    if (onError) onError(null)
    try {
      await UpdatePawnInterest(pawn.id, rate, amt)
      setEditing(false)
      if (onReload) onReload()
    } catch (err) {
      if (onError) onError('บันทึกดอกเบี้ยไม่สำเร็จ: ' + err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">การเงิน</span>
      </div>
      <div className="pd-info-rows">
        {/* 1. Initial Principal: Turns gray if the value has changed */}
        <PdRow
          label="เงินต้นเริ่มต้น"
          value={
            <span style={{
              color: current !== pawn.initial_principal ? 'var(--text-muted)' : 'inherit',
              textDecoration: current !== pawn.initial_principal ? 'line-through' : 'none'
            }}>
              {formatBaht(pawn.initial_principal)}
            </span>
          }
        />

        {/* 2. Current Principal: Normal bold text */}
        {current !== pawn.initial_principal && (
          <PdRow
            label="เงินต้นปัจจุบัน"
            value={<strong>{formatBaht(current)}</strong>}
          />
        )}

        <div className="pd-row" style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? 8 : 4 }}>
            <span className="pd-row-label">ดอกเบี้ย/เดือน</span>
            {!editing && isActive && (
              <button
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--text-muted)' }}
                onClick={handleEdit}
                title="แก้ไขดอกเบี้ย"
              >
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
            )}
          </div>

          {!editing ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 2 }}>
              <span className="pd-row-value" style={{ fontWeight: 500 }}>
                {formatBaht(pawn.interest_amount)}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                  (อัตราดอกเบี้ย {pawn.monthly_interest_rate}%)
                </span>
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>อัตราดอกเบี้ย (% / เดือน)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
                    value={editRate}
                    onChange={handleRateChange}
                    autoFocus
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>ดอกเบี้ย (บาท / เดือน)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '...' : 'บันทึก'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
