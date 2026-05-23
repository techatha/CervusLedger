import React, { useState } from 'react'
import { toBE } from '../../../utils/thai'
import { UpdatePawnDescription } from '../../../../wailsjs/go/handlers/PawnHandler'

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

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">ข้อมูลจำนำ</span>
      </div>
      <div className="pd-info-rows">
        <PdRow label="วันที่จำนำ" value={toBE(pawn.pawned_date)} />
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
                onClick={() => {
                  setEditDescValue(pawn.description || '')
                  setEditingDesc(true)
                }}
              >
                แก้ไข
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
