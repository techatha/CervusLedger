import { useEffect, useRef } from 'react'
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
  // Logs arrays to cache calculations for Month view and Daily view
  const monthLogs = useRef([])
  const dailyLogs = useRef([])

  const incomeChartRef = useRef(null)
  const expenseChartRef = useRef(null)
  const incomeChartInstance = useRef(null)
  const expenseChartInstance = useRef(null)

  // Compute unique hash based on item IDs, amounts, categories, types, and colors to trigger cache invalidation on edits
  const getEntriesHash = (items) => {
    return items.map(e => `${e.id}_${e.amount}_${e.category || ''}_${e.color || ''}_${e.type || ''}`).join('|')
  }

  // Calculate categories details
  const computeStats = (items) => {
    let totalIncome = 0
    let totalExpense = 0
    const incomeCats = {}
    const expenseCats = {}

    items.forEach(e => {
      const amt = e.amount || 0
      const cat = e.category || 'อื่นๆ'
      const col = e.color || '#cbd5e1'

      if (e.type === 'income') {
        totalIncome += amt
        if (!incomeCats[cat]) {
          incomeCats[cat] = { name: cat, amount: 0, color: col }
        }
        incomeCats[cat].amount += amt
      } else {
        totalExpense += amt
        if (!expenseCats[cat]) {
          expenseCats[cat] = { name: cat, amount: 0, color: col }
        }
        expenseCats[cat].amount += amt
      }
    })

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      incomeCategories: Object.values(incomeCats).sort((a, b) => b.amount - a.amount),
      expenseCategories: Object.values(expenseCats).sort((a, b) => b.amount - a.amount),
    }
  }

  // Get stats from array logs (cache) or calculate and push to logs
  const getViewData = () => {
    if (selectedDate) {
      const dayEntries = entries.filter(e => e.date?.slice(0, 10) === selectedDate)
      const hash = getEntriesHash(dayEntries)

      // Search logs array
      const existing = dailyLogs.current.find(
        log => log.dateKey === selectedDate && log.entriesHash === hash
      )
      if (existing) {
        console.log(`[SummaryPanel Cache Hit] Daily stats for ${selectedDate}`)
        return existing.result
      }

      console.log(`[SummaryPanel Cache Miss] Computing daily stats for ${selectedDate}`)
      const result = computeStats(dayEntries)
      dailyLogs.current.push({ dateKey: selectedDate, entriesHash: hash, result })
      return result
    } else {
      const monthKey = `${year}-${month}`
      const hash = getEntriesHash(entries)

      // Search logs array
      const existing = monthLogs.current.find(
        log => log.monthKey === monthKey && log.entriesHash === hash
      )
      if (existing) {
        console.log(`[SummaryPanel Cache Hit] Monthly stats for ${monthKey}`)
        return existing.result
      }

      console.log(`[SummaryPanel Cache Miss] Computing monthly stats for ${monthKey}`)
      const result = computeStats(entries)
      monthLogs.current.push({ monthKey, entriesHash: hash, result })
      return result
    }
  }

  const stats = getViewData()

  // Format header title dynamically
  const getFormattedTitle = () => {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00')
      return `ยอดของวันที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
    } else {
      return `ยอดประจำเดือน ${THAI_MONTHS[month]} ${year + 543}`
    }
  }

  // Calculate ratio bar values
  const totalFlow = stats.totalIncome + stats.totalExpense
  const incomePercent = totalFlow > 0 ? (stats.totalIncome / totalFlow) * 100 : 50
  const expensePercent = totalFlow > 0 ? (stats.totalExpense / totalFlow) * 100 : 50

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
          layout: {
            padding: 8
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 8,
                font: {
                  family: 'Sarabun',
                  size: 10
                }
              }
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
          layout: {
            padding: 8
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 8,
                font: {
                  family: 'Sarabun',
                  size: 10
                }
              }
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
        {/* Title */}
        <h3 className="sp-title">{getFormattedTitle()}</h3>

        {/* Ratio bar (Income vs Expense Ratio) */}
        <div className="sp-bar-section">
          {totalFlow > 0 ? (
            <>
              <div className="sp-bar-labels">
                <span className="sp-bar-label income">รายรับ {incomePercent.toFixed(0)}%</span>
                <span className="sp-bar-label expense">รายจ่าย {expensePercent.toFixed(0)}%</span>
              </div>
              <div className="sp-oblong-bar">
                <div className="sp-oblong-fill income" style={{ width: `${incomePercent}%` }} />
                <div className="sp-oblong-fill expense" style={{ width: `${expensePercent}%` }} />
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
