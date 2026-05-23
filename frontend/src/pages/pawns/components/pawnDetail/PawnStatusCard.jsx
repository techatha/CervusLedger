import React from 'react'

export default function PawnStatusCard({ pawn, isActive, onStatusChange }) {
  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-title">สถานะตั๋ว</span>
        <span className={`badge ${pawn.ticket_status === 'active' ? 'badge-green' : 'badge-amber'}`}>
          {pawn.ticket_status === 'active' ? 'ปกติ'
            : pawn.ticket_status === 'lost' ? '⚠ ทำหาย'
              : '⚠ ชำรุด'
          }
        </span>
      </div>

      <div className="pd-info-rows">
        {isActive && pawn.ticket_status === 'active' && (
          <div className="pd-status-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => onStatusChange('lost')}>
              <span className="dot yellow"></span> แจ้งทำหาย
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onStatusChange('damaged')}>
              <span className="dot orange"></span> แจ้งชำรุด
            </button>
          </div>
        )}
        {isActive && pawn.ticket_status !== 'active' && (
          <div className="pd-status-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => onStatusChange('active')}>
              <span className="dot green"></span>คืนค่าปกติ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
