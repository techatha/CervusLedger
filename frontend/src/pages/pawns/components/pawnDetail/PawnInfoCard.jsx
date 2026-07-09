import React from 'react'
import { toBE } from '@/utils/thai'
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

export default function PawnInfoCard({ pawn, pawnId, isActive, onEditInfo, onReload, onError }) {
  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-title">ข้อมูลจำนำ</span>
        {isActive && (
          <button
            className="btn btn-ghost btn-xs"
            style={{ color: 'var(--text-muted)' }}
            onClick={onEditInfo}
            title="แก้ไขข้อมูลจำนำ"
          >
            <FontAwesomeIcon icon={faPenToSquare} /> แก้ไขข้อมูล
          </button>
        )}
      </div>
      <div className="pd-info-rows">
        <div className="pd-row">
          <span className="pd-row-label">เลขที่ตั๋ว</span>
          <div className="pd-row-value">
            <strong style={{ color: 'var(--gold)', fontFamily: 'Courier New, monospace', fontSize: '15px' }}>
              {String(pawn.ticket_number).padStart(4, '0')}
            </strong>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span className="pd-row-label">รายละเอียด</span>
          </div>
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
        </div>
      </div>
    </div>
  )
}
