import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartPie } from '@fortawesome/free-solid-svg-icons'
import { formatBaht } from '@/utils/thai'
import './SummaryPanel.css'

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/**
 * SummaryPanel — right sidebar with summary cards and charts.
 */
export default function SummaryPanel({ entries = [], selectedDate, year, month }) {
  const monthLogs = useRef([])
  const dailyLogs = useRef([])

  const incomeChartRef = useRef(null)
  const expenseChartRef = useRef(null)
  const incomeChartInstance = useRef(null)
  const expenseChartInstance = useRef(null)

  const [hoveredSegment, setHoveredSegment] = useState(null)

  const getEntriesHash = (items) => {
    return items.map(e => `${e.id}_${e.amount}_${e.category || ''}_${e.color || ''}_${e.type || ''}_${e.is_bank_transfer || false}`).join('|')
  }

  const computeStats = (items) => {
    let totalIncome = 0
    let totalExpense = 0
    let totalIncomeBank = 0
    let totalExpenseBank = 0
    const incomeCats = {}
    const expenseCats = {}

    items.forEach(e => {
      const amt = e.amount || 0
      const cat = e.category || 'อื่นๆ'
      const col = e.color || '#cbd5e1'

      if (e.type === 'income') {
        totalIncome += amt
        if (e.is_bank_transfer) totalIncomeBank += amt
        if (!incomeCats[cat]) {
          incomeCats[cat] = { name: cat, amount: 0, color: col }
        }
        incomeCats[cat].amount += amt
      } else {
        totalExpense += amt
        if (e.is_bank_transfer) totalExpenseBank += amt
        if (!expenseCats[cat]) {
          expenseCats[cat] = { name: cat, amount: 0, color: col }
        }
        expenseCats[cat].amount += amt
      }
    })

    return {
      totalIncome,
      totalExpense,
      totalIncomeBank,
      totalExpenseBank,
      totalIncomeCash: totalIncome - totalIncomeBank,
      totalExpenseCash: totalExpense - totalExpenseBank,
      net: totalIncome - totalExpense,
      incomeCategories: Object.values(incomeCats).sort((a, b) => b.amount - a.amount),
      expenseCategories: Object.values(expenseCats).sort((a, b) => b.amount - a.amount),
    }
  }

  const getViewData = () => {
    if (selectedDate) {
      const dayEntries = entries.filter(e => e.date?.slice(0, 10) === selectedDate)
      const hash = getEntriesHash(dayEntries)

      const existing = dailyLogs.current.find(
        log => log.dateKey === selectedDate && log.entriesHash === hash
      )
      if (existing) return existing.result

      const result = computeStats(dayEntries)
      dailyLogs.current.push({ dateKey: selectedDate, entriesHash: hash, result })
      return result
    } else {
      const monthKey = `${year}-${month}`
      const hash = getEntriesHash(entries)

      const existing = monthLogs.current.find(
        log => log.monthKey === monthKey && log.entriesHash === hash
      )
      if (existing) return existing.result

      const result = computeStats(entries)
      monthLogs.current.push({ monthKey, entriesHash: hash, result })
      return result
    }
  }

  const stats = getViewData()

  const getFormattedTitle = () => {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00')
      return `ยอดของวันที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
    } else {
      return `ยอดประจำเดือน ${THAI_MONTHS[month]} ${year + 543}`
    }
  }

  const totalFlow = stats.totalIncome + stats.totalExpense
  const incomePercent = totalFlow > 0 ? (stats.totalIncome / totalFlow) * 100 : 50
  const expensePercent = totalFlow > 0 ? (stats.totalExpense / totalFlow) * 100 : 50

  // Build segment list (in visual order) with percent-of-bar widths, then
  // stamp each with its cumulative left offset so the tooltip can center itself.
  const rawSegments = [
    {
      key: 'income-cash',
      amount: stats.totalIncomeCash,
      percent: incomePercent * (stats.totalIncome > 0 ? stats.totalIncomeCash / stats.totalIncome : 0),
      color: 'var(--green)',
      label: 'รายรับ · เงินสด',
    },
    {
      key: 'income-bank',
      amount: stats.totalIncomeBank,
      percent: incomePercent * (stats.totalIncome > 0 ? stats.totalIncomeBank / stats.totalIncome : 0),
      color: '#8ee0b0',
      label: 'รายรับ · โอนธนาคาร',
    },
    {
      key: 'expense-bank',
      amount: stats.totalExpenseBank,
      percent: expensePercent * (stats.totalExpense > 0 ? stats.totalExpenseBank / stats.totalExpense : 0),
      color: '#f59898',
      label: 'รายจ่าย · โอนธนาคาร',
    },
    {
      key: 'expense-cash',
      amount: stats.totalExpenseCash,
      percent: expensePercent * (stats.totalExpense > 0 ? stats.totalExpenseCash / stats.totalExpense : 0),
      color: 'var(--red)',
      label: 'รายจ่าย · เงินสด',
    },
  ]

  let cumulative = 0
  const barSegments = rawSegments.map(seg => {
    const left = cumulative
    cumulative += seg.percent
    return { ...seg, left }
  })

  // Render / update charts on stats change
  useEffect(() => {
    if (incomeChartInstance.current) {
      incomeChartInstance.current.destroy()
      incomeChartInstance.current = null
    }
    if (expenseChartInstance.current) {
      expenseChartInstance.current.destroy()
      expenseChartInstance.current = null
    }

    if (incomeChartRef.current && stats.incomeCategories.length > 0) {
      const totalIncome = stats.totalIncome
      const visualIncomeData = stats.incomeCategories.map(c => {
        const minVal = totalIncome * 0.03
        return c.amount < minVal ? minVal : c.amount
      })

      const ctx = incomeChartRef.current.getContext('2d')
      incomeChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: stats.incomeCategories.map(c => c.name),
          datasets: [{
            data: visualIncomeData,
            backgroundColor: stats.incomeCategories.map(c => c.color),
            borderWidth: 1,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 8 },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { family: 'Sarabun', size: 10 } }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const idx = context.dataIndex
                  const realVal = stats.incomeCategories[idx].amount
                  return ` ${context.label}: ${formatBaht(realVal)}`
                }
              }
            }
          }
        }
      })
    }

    if (expenseChartRef.current && stats.expenseCategories.length > 0) {
      const totalExpense = stats.totalExpense
      const visualExpenseData = stats.expenseCategories.map(c => {
        const minVal = totalExpense * 0.03
        return c.amount < minVal ? minVal : c.amount
      })

      const ctx = expenseChartRef.current.getContext('2d')
      expenseChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: stats.expenseCategories.map(c => c.name),
          datasets: [{
            data: visualExpenseData,
            backgroundColor: stats.expenseCategories.map(c => c.color),
            borderWidth: 1,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 8 },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { family: 'Sarabun', size: 10 } }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const idx = context.dataIndex
                  const realVal = stats.expenseCategories[idx].amount
                  return ` ${context.label}: ${formatBaht(realVal)}`
                }
              }
            }
          }
        }
      })
    }

    return () => {
      if (incomeChartInstance.current) incomeChartInstance.current.destroy()
      if (expenseChartInstance.current) expenseChartInstance.current.destroy()
    }
  }, [stats])

  return (
    <div className="sp-panel">
      <div className="sp-panel-card">
        <h3 className="sp-title">{getFormattedTitle()}</h3>

        {/* Ratio bar (Income vs Expense Ratio) */}
        <div className="sp-bar-section">
          {totalFlow > 0 ? (
            <>
              <div className="sp-bar-labels">
                <span className="sp-bar-label income">รายรับ {incomePercent.toFixed(0)}%</span>
                <span className="sp-bar-label expense">รายจ่าย {expensePercent.toFixed(0)}%</span>
              </div>

              <div className="sp-bar-wrap">
                <div className="sp-oblong-bar">
                  {barSegments.map(seg => seg.amount > 0 && (
                    <div
                      key={seg.key}
                      className="sp-oblong-fill"
                      style={{ width: `${seg.percent}%`, background: seg.color }}
                      onMouseEnter={() => setHoveredSegment(seg)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    />
                  ))}
                </div>

                {hoveredSegment && (
                  <div
                    className="sp-segment-tooltip"
                    style={{ left: `${Math.min(94, Math.max(6, hoveredSegment.left + hoveredSegment.percent / 2))}%` }}
                  >
                    <span className="sp-segment-tooltip-label">{hoveredSegment.label}</span>
                    <span className="sp-segment-tooltip-val">{formatBaht(hoveredSegment.amount)}</span>
                  </div>
                )}
              </div>

              <div className="sp-bar-labels">
                <span className="sp-bar-label income">{formatBaht(stats.totalIncome)}</span>
                <span className="sp-bar-label expense">{formatBaht(stats.totalExpense)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="sp-bar-labels">
                <div className="sp-bar-label">ไม่มีรายรับรายจ่าย</div>
              </div>
              <div className="sp-oblong-bar">
                <div className="sp-oblong-fill empty" style={{ width: '100%', background: 'var(--divider)' }} />
              </div>
            </>
          )}
          <div className="sp-total-flow">
            ยอดหมุนเวียนรวม: <strong>{formatBaht(totalFlow)}</strong>
          </div>
        </div>

        {/* Category Doughnuts */}
        <div className="sp-charts-section">
          <div className="sp-chart-card">
            <h4 className="sp-chart-title">สัดส่วนรายรับ</h4>
            {stats.incomeCategories.length > 0 ? (
              <div className="sp-chart-container">
                <canvas ref={incomeChartRef} />
              </div>
            ) : (
              <div className="sp-chart-empty">
                <FontAwesomeIcon icon={faChartPie} className="sp-chart-empty-icon" />
                <span>ไม่มีรายการรายรับ</span>
              </div>
            )}
          </div>

          <div className="sp-chart-card">
            <h4 className="sp-chart-title">สัดส่วนรายจ่าย</h4>
            {stats.expenseCategories.length > 0 ? (
              <div className="sp-chart-container">
                <canvas ref={expenseChartRef} />
              </div>
            ) : (
              <div className="sp-chart-empty"> 
                <FontAwesomeIcon icon={faChartPie} className="sp-chart-empty-icon" />
                <span>ไม่มีรายการรายจ่าย</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
