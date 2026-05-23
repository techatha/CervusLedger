import { formatBaht } from '../../../../utils/thai'

export default function CustomerStatsGrid({ activePawnsCount, overdueCount, totalActive, totalPawnsCount }) {
  return (
    <div className="cp-stat-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      <StatCard
        label="จำนำที่ยังอยู่"
        value={activePawnsCount}
        unit="รายการ"
        color="green"
      />
      <StatCard
        label="ค้างจ่ายดอกเบี้ย"
        value={overdueCount}
        unit="รายการ"
        color="red"
      />
      <StatCard
        label="ยอดรวมปัจจุบัน"
        value={formatBaht(totalActive)}
        color="gold"
      />
      <StatCard
        label="รายการจำนำทั้งหมด"
        value={totalPawnsCount}
        unit="รายการ"
        color="muted"
      />
    </div>
  )
}

function StatCard({ label, value, unit, color }) {
  const colorMap = {
    green: { bg: 'var(--green-bg)', text: 'var(--green)' },
    red: { bg: 'var(--red-bg)', text: 'var(--red)' },
    gold: { bg: 'var(--bg-card)', text: 'var(--gold-light)' },
    muted: { bg: 'var(--bg-card)', text: 'var(--text-muted)' },
  }
  const c = colorMap[color] || colorMap.muted
  return (
    <div className="cp-stat" style={{ background: c.bg }}>
      <div className="cp-stat-value" style={{ color: c.text }}>
        {value}
        {unit && <span className="cp-stat-unit">{unit}</span>}
      </div>
      <div className="cp-stat-label">{label}</div>
    </div>
  )
}
