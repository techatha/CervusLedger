import { formatBaht } from '@/utils/thai'
import './SummaryPanel.css'

/**
 * SummaryPanel — right sidebar with summary cards.
 *
 * @param {Object|null} summary - { total_income, total_expense, net }
 */
export default function SummaryPanel({ summary }) {
  return (
    <div className="sp-panel">
      {/* Summary cards */}
      {summary && (
        <div className="sp-cards">
          <SummaryCard
            label="รายรับ"
            value={summary.total_income}
            color="green"
            icon={<IconIncome />}
          />
          <SummaryCard
            label="รายจ่าย"
            value={summary.total_expense}
            color="red"
            icon={<IconExpense />}
          />
          <SummaryCard
            label="คงเหลือสุทธิ"
            value={summary.net}
            color={summary.net >= 0 ? 'gold' : 'red'}
            icon={<IconNet />}
            large
          />
        </div>
      )}
    </div>
  )
}

/* ─── Summary Card ────────────────────────────────────────────────── */
function SummaryCard({ label, value, color, icon, large }) {
  const colors = {
    green: { bg:'var(--green-bg)',  border:'rgba(61,154,104,0.2)',  text:'var(--green)'  },
    red:   { bg:'var(--red-bg)',    border:'rgba(192,72,72,0.2)',   text:'var(--red)'    },
    gold:  { bg:'var(--bg-hover)', border:'var(--border)',          text:'var(--gold)'   },
  }
  const c = colors[color] || colors.gold
  return (
    <div className={`ip-stat ${large ? 'ip-stat-large' : ''}`}
      style={{ background:c.bg, border:`1px solid ${c.border}` }}>
      <div className="ip-stat-icon" style={{ color:c.text }}>{icon}</div>
      <div className="ip-stat-body">
        <div className="ip-stat-label">{label}</div>
        <div className="ip-stat-value" style={{ color:c.text }}>
          {formatBaht(value)}
        </div>
      </div>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────────── */
function IconIncome()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
function IconExpense() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> }
function IconNet()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
