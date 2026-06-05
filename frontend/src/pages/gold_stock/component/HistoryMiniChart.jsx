import { formatShortThaiDate } from '@/utils/thai'

export function amountDelta(current, previous) {
  if (previous == null) return 'neutral'
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'neutral'
}

export default function HistoryMiniChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="gl-history-chips">
        <span className="gl-history-empty">ยังไม่มีบันทึก</span>
      </div>
    )
  }

  const recent = [...history].slice(-4)

  return (
    <div className="gl-history-chips">
      {recent.map((entry, i) => {
        const prev = recent[i - 1]
        const delta = amountDelta(entry.amount, prev?.amount)
        return (
          <div
            key={i}
            className={`gl-history-chip gl-history-chip-${delta}`}
            title={entry.log_date}
          >
            <span className="gl-history-chip-date">{formatShortThaiDate(entry.log_date)}</span>
            <span className="gl-history-chip-val">{entry.amount} ชิ้น</span>
          </div>
        )
      })}
    </div>
  )
}
