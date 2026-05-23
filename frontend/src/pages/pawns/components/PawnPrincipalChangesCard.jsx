import React from 'react'
import { toBE, formatBaht } from '../../../utils/thai'

export default function PawnPrincipalChangesCard({ changes }) {
  if (!changes || changes.length === 0) return null

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">บันทึกเปลี่ยนแปลงเงินต้น</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ประเภท</th>
              <th style={{ textAlign: 'right' }}>จำนวน</th>
              <th style={{ textAlign: 'right' }}>เงินต้นใหม่</th>
              <th className="th-notes">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(c => (
              <tr key={c.id} style={{ cursor: 'default' }}>
                <td style={{ whiteSpace: 'nowrap' }}>{toBE(c.date)}</td>
                <td>
                  <span className={`badge ${c.change_type === 'reduction' ? 'badge-green' : 'badge-amber'}`}>
                    {c.change_type === 'reduction' ? 'ลดต้น' : 'เพิ่มต้น'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {c.change_type === 'reduction' ? '−' : '+'}{formatBaht(c.amount)}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                  {formatBaht(c.new_principal)}
                </td>
                <td className="td-notes" title={c.notes}>
                  {c.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
