import React from 'react'
import { formatBaht } from '@/utils/thai'

function PdRow({ label, value }) {
  return (
    <div className="pd-row">
      <span className="pd-row-label">{label}</span>
      <span className="pd-row-value">{value}</span>
    </div>
  )
}

export default function PawnFinancialCard({ pawn }) {
  const current = pawn.current_principal ?? pawn.initial_principal

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

        <PdRow
          label="ดอกเบี้ย/เดือน"
          value={
            <span>
              {formatBaht(pawn.interest_amount)}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                ({pawn.monthly_interest_rate}%)
              </span>
            </span>
          }
        />
      </div>
    </div>
  )
}
