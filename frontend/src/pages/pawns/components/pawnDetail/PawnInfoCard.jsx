import React, { useState, useEffect } from 'react'
import { toBE } from '@/utils/thai'
import { UpdatePawnDescription, UpdateTicketNumber, GetPawnSettings } from 'wailsjs/go/pawn_handler/PawnHandler'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faCalendarDays } from '@fortawesome/free-solid-svg-icons'

function PdRow({ label, value }) {
  return (
    <div className="pd-row">
      <span className="pd-row-label">{label}</span>
      <span className="pd-row-value">{value}</span>
    </div>
  )
}

export default function PawnInfoCard({ pawn, pawnId, isActive, onReload, onError }) {
  const [editingDesc, setEditingDesc] = useState(false)
  const [editDescValue, setEditDescValue] = useState('')

  const handleSaveDescription = async () => {
    try {
      await UpdatePawnDescription(pawnId, editDescValue)
      setEditingDesc(false)
      if (onReload) onReload()
    } catch (e) {
      if (onError) onError('ไม่สามารถบันทึกรายละเอียดได้: ' + e)
    }
  }

  const [editingTicket, setEditingTicket] = useState(false)
  const [editTicketValue, setEditTicketValue] = useState('')
  const [savingTicket, setSavingTicket] = useState(false)

  const handleEditTicketClick = async () => {
    try {
      const s = await GetPawnSettings()
      setEditTicketValue(String(s.LastTicket + 1))
      setEditingTicket(true)
    } catch (e) {
      setEditTicketValue(String(pawn.ticket_number))
      setEditingTicket(true)
    }
  }

  const handleSaveTicket = async () => {
    const newNum = parseInt(editTicketValue, 10)
    if (isNaN(newNum) || newNum <= 0) {
      if (onError) onError('กรุณากรอกเลขตั๋วให้ถูกต้อง')
      return
    }
    if (newNum === pawn.ticket_number) {
      setEditingTicket(false)
      return
    }
    setSavingTicket(true)
    try {
      await UpdateTicketNumber(pawnId, newNum)
      setEditingTicket(false)
      if (onReload) onReload()
    } catch (e) {
      if (onError) onError(String(e))
    } finally {
      setSavingTicket(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">ข้อมูลจำนำ</span>
      </div>
      <div className="pd-info-rows">
        <div className="pd-row" style={editingTicket ? { display: 'block' } : {}}>
          {editingTicket ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <span className="pd-row-label">แก้ไขเลขที่ตั๋ว</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', padding: '8px' }}
                  value={editTicketValue}
                  onChange={e => setEditTicketValue(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditingTicket(false)}
                    disabled={savingTicket}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveTicket}
                    disabled={savingTicket}
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="pd-row-label">เลขที่ตั๋ว</span>
              <div className="pd-row-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ color: 'var(--gold)', fontFamily: 'Courier New, monospace', fontSize: '15px' }}>
                  {String(pawn.ticket_number).padStart(4, '0')}
                </strong>
                {isActive && (
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={handleEditTicketClick}
                    title="แก้ไขเลขตั๋ว"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <PdRow 
          label="วันที่จำนำ" 
          value={
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FontAwesomeIcon icon={faCalendarDays} style={{ color: 'var(--text-muted)' }} />
              {toBE(pawn.pawned_date)}
            </div>
          } 
        />
        <PdRow label="ประเภทรายการ" value={pawn.item_type} />
        {pawn.weight_grams > 0 && (
          <PdRow label="น้ำหนัก" value={`${pawn.weight_grams} กรัม`} />
        )}

        <div className="pd-row" style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingDesc ? 8 : 4 }}>
            <span className="pd-row-label">รายละเอียด</span>

            {!editingDesc && isActive && (
              <button
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => {
                  setEditDescValue(pawn.description || '')
                  setEditingDesc(true)
                }}
                title="แก้ไขรายละเอียด"
              >
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
            )}
          </div>

          {editingDesc ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                className="input"
                style={{ padding: '8px 12px', fontSize: 13, width: '100%', minHeight: '60px', resize: 'vertical' }}
                value={editDescValue}
                onChange={e => setEditDescValue(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 10px' }}
                  onClick={() => setEditingDesc(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '4px 10px' }}
                  onClick={handleSaveDescription}
                >
                  บันทึก
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              marginTop: 10,
              padding: '12px 14px',
              background: 'var(--bg-base)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {pawn.description || <span className="text-muted">—</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
