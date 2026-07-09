import React from 'react'
import { toBE } from '@/utils/thai'

export default function PawnTicketLogsCard({ logs }) {
  if (!logs || logs.length === 0) return null

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">ประวัติการเปลี่ยนเลขตั๋ว</span>
      </div>
      <div className="card-body" style={{ padding: '0 0 8px 0' }}>
        <table className="table" style={{ fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>วันเวลา</th>
              <th style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center' }}>เลขเดิม</th>
              <th style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center' }}>เลขใหม่</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              // Parse date "YYYY-MM-DD HH:MM:SS" or similar
              let formattedDate = log.changed_at
              try {
                if (log.changed_at) {
                  const d = new Date(log.changed_at)
                  if (!isNaN(d.getTime())) {
                    const datePart = toBE(log.changed_at.split('T')[0] || log.changed_at.split(' ')[0])
                    const timePart = d.toTimeString().slice(0, 5)
                    formattedDate = `${datePart} ${timePart}`
                  }
                }
              } catch (e) {}

              return (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                    {formattedDate}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      {String(log.old_ticket_number).padStart(4, '0')}
                    </span>
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <strong style={{ color: 'var(--gold)', fontFamily: 'Courier New, monospace' }}>
                      {String(log.new_ticket_number).padStart(4, '0')}
                    </strong>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
