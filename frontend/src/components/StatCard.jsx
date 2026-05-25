export default function StatCard({
  label,
  value,
  unit,
  sub,
  color,
  icon,
  onClick,
  variant = 'dashboard', // 'dashboard' | 'profile'
}) {
  const dashboardColors = {
    gold: { bg: 'var(--bg-hover)', border: 'var(--border)', text: 'var(--gold)' },
    green: { bg: 'var(--green-bg)', border: 'rgba(61,154,104,0.2)', text: 'var(--green)' },
    blue: { bg: 'var(--blue-bg)', border: 'rgba(61,114,170,0.2)', text: 'var(--blue)' },
    red: { bg: 'var(--red-bg)', border: 'rgba(192,72,72,0.2)', text: 'var(--red)' },
  }

  const profileColors = {
    green: { bg: 'var(--green-bg)', border: 'var(--border)', text: 'var(--green)' },
    red: { bg: 'var(--red-bg)', border: 'var(--border)', text: 'var(--red)' },
    gold: { bg: 'var(--bg-card)', border: 'var(--border)', text: 'var(--gold-light)' },
    muted: { bg: 'var(--bg-card)', border: 'var(--border)', text: 'var(--text-muted)' },
  }

  const colorConfig = variant === 'profile' ? profileColors : dashboardColors
  const c = colorConfig[color] || colorConfig.muted || colorConfig.gold

  if (variant === 'profile') {
    return (
      <div className="cp-stat" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
        <div className="cp-stat-value" style={{ color: c.text }}>
          {value}
          {unit && <span className="cp-stat-unit">{unit}</span>}
        </div>
        <div className="cp-stat-label">{label}</div>
      </div>
    )
  }

  return (
    <div
      className="db-stat-card"
      style={{ background: c.bg, border: `1px solid ${c.border}`, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="db-stat-top">
        {icon && <div className="db-stat-icon" style={{ color: c.text }}>{icon}</div>}
        <div className="db-stat-label">{label}</div>
      </div>
      <div className="db-stat-value" style={{ color: c.text }}>
        {value}
        {unit && <span className="db-stat-unit">{unit}</span>}
      </div>
      {sub && <div className="db-stat-sub">{sub}</div>}
    </div>
  )
}
