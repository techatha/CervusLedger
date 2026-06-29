import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'

import { GetDashboardStats } from 'wailsjs/go/dashboard_handler/DashboardHandler.js'
import { ListIncomeExpense } from 'wailsjs/go/income_expense_handler/IncomeExpenseHandler.js'
import { ListPawnsSorted } from 'wailsjs/go/pawn_handler/PawnHandler.js'
import { GetPriceHistory } from 'wailsjs/go/gold_price_handler/GoldPriceHandler.js'
import { getPendingMonths } from '@/utils/pawn'
import { toBE, formatBaht, formatTicket } from '@/utils/thai'
import GoldPriceDashboard from '@/components/GoldPriceDashboard'
import StatCard from '@/components/StatCard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faRotateRight,
  faBox,
  faCoins,
  faArrowUp,
  faArrowDown,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import './Dashboard.css'

// ─── Date helpers ─────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10)
}
function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── Thai helpers ─────────────────────────────────────────────────────
const THAI_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                            'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function nowBE() {
  const d = new Date()
  return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

function formatDayLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`
}

// ─── Build 30-day skeleton for monthly chart ──────────────────────────
function buildDaysSkeleton(daysBack = 30) {
  const result = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    result.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`,
      income: 0,
      expense: 0,
    })
  }
  return result
}

// ─── Parse "เวลา HH:MM น. (...)" → "HH:MM" ───────────────────────────
function parseUpdateTime(str) {
  if (!str) return null
  const m = str.match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

// ─── Customer avatar helpers ──────────────────────────────────────────
const AVATAR_CLASSES = ['av0', 'av1', 'av2', 'av3', 'av4']

function getCustomerInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const prefixes = ['นาย','นาง','นางสาว','เด็กชาย','เด็กหญิง','คุณ','ด.ช.','ด.ญ.']
  let nameParts = parts
  if (parts.length > 1 && prefixes.includes(parts[0])) nameParts = parts.slice(1)
  const f = nameParts[0]?.charAt(0) ?? '?'
  const l = nameParts[1]?.charAt(0) ?? ''
  return f + l
}

// ─────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  const [stats,        setStats]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [monthlyData,  setMonthlyData]  = useState([])
  const [unpaidPawns,  setUnpaidPawns]  = useState([])
  const [goldHistory,  setGoldHistory]  = useState([])
  const [todaySummary, setTodaySummary] = useState({ income: 0, expense: 0 })

  const priceDashboardRef = useRef()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashData, monthlyRaw, pawnsRaw, goldRaw] = await Promise.all([
        GetDashboardStats(),
        ListIncomeExpense({ type: '', source: '', start_date: monthStart(), end_date: today() }),
        ListPawnsSorted('active', '', 'pawned_date', 'desc'),
        GetPriceHistory(30),
      ])

      setStats(dashData)

      // Monthly bar chart
      const skeleton = buildDaysSkeleton(30)
      const byDate = {}
      skeleton.forEach(d => { byDate[d.date] = d })
      monthlyRaw?.forEach(tx => {
        const key = tx.date?.slice(0, 10)
        if (byDate[key]) {
          if (tx.type === 'income')  byDate[key].income  += tx.amount
          if (tx.type === 'expense') byDate[key].expense += tx.amount
        }
      })
      setMonthlyData(skeleton)

      // Today doughnut
      const td = today()
      let inc = 0, exp = 0
      monthlyRaw?.forEach(tx => {
        if (tx.date?.slice(0, 10) === td) {
          if (tx.type === 'income')  inc += tx.amount
          if (tx.type === 'expense') exp += tx.amount
        }
      })
      setTodaySummary({ income: inc, expense: exp })

      // Unpaid pawns — sort by overdue/unpaid months ascending
      const unpaid = (pawnsRaw || [])
        .filter(p => { const pm = getPendingMonths(p, []); return pm && pm.length > 0 })
        .map(p => ({ ...p, overdueMonths: getPendingMonths(p, []).length }))
      unpaid.sort((a, b) => {
        if (a.overdueMonths !== b.overdueMonths) {
          return a.overdueMonths - b.overdueMonths
        }
        const nameA = (a.customer_name || '').trim()
        const nameB = (b.customer_name || '').trim()
        const cmp = nameA.localeCompare(nameB, 'th')
        if (cmp !== 0) return cmp
        return new Date(b.pawned_date) - new Date(a.pawned_date)
      })
      setUnpaidPawns(unpaid)

      // Gold history: newest-first from API → reverse to oldest-first for chart
      setGoldHistory((goldRaw || []).slice().reverse())

    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="page-view">
      <div className="empty-state"><div className="empty-state-text">กำลังโหลด...</div></div>
    </div>
  )

  return (
    <div className="page-view">

      {/* ── Header ── */}
      <div className="db-header">
        <div>
          <div className="page-title">แดชบอร์ด</div>
          <div className="page-meta">{nowBE()}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <IconRefresh /> รีเฟรช
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && <>

        {/* ── ROW 1: Gold Price Panel + 4 Stat Cards ── */}
        <div className="db-top-section">
          <div className="db-price-col">
            <GoldPriceDashboard ref={priceDashboardRef} />
          </div>
          <div className="db-stats-window">
            <StatCard
              label="จำนำคงค้าง"
              value={stats.active_pawn_count}
              unit="รายการ"
              sub={`ยอดรวม ${formatBaht(stats.active_pawn_principal)}`}
              color="amber"
              icon={<IconPawn />}
              onClick={() => navigate('/pawns')}
            />
            <StatCard
              label="ดอกเบี้ยเดือนนี้"
              value={formatBaht(stats.month_interest_collected)}
              sub={`จ่ายแล้ว ${stats.paid_this_month} · ค้าง ${stats.unpaid_this_month} ราย`}
              color="teal"
              icon={<IconCash />}
              onClick={() => navigate('/income')}
            />
            <StatCard
              label="รายรับวันนี้"
              value={formatBaht(stats.today_income)}
              sub={stats.today_new_pawns > 0 ? `จำนำใหม่ ${stats.today_new_pawns} ราย` : 'ไม่มีจำนำใหม่'}
              color="green"
              icon={<IconIncome />}
              onClick={() => navigate('/income')}
            />
            <StatCard
              label="รายจ่ายวันนี้"
              value={formatBaht(stats.today_expense)}
              sub={`สุทธิ ${formatBaht(stats.today_income - stats.today_expense)}`}
              color={stats.today_income - stats.today_expense >= 0 ? 'blue' : 'red'}
              icon={<IconExpense />}
              onClick={() => navigate('/income')}
            />
          </div>
        </div>

        {/* ── ROW 2: Gold intraday | Monthly bar | Today doughnut ── */}
        <div className="db-charts-row">
          <GoldLineChart history={goldHistory} />
          <MonthlyChart data={monthlyData} />
          <TodayDoughnut summary={todaySummary} />
        </div>

        {/* ── ROW 3: Unpaid Pawns | Payment Meter + Recent Activity ── */}
        <div className="db-mid">
          <UnpaidPawnList pawns={unpaidPawns} onNavigate={navigate} />

          <div className="db-mid-right">
            {/* Payment meter */}
            <div className="card db-pawn-status">
              <div className="card-header">
                <span className="card-title">สถานะดอกเบี้ย เดือนนี้</span>
                <button className="btn btn-ghost btn-xs" onClick={() => navigate('/pawns?status=active')}>
                  ดูทั้งหมด
                </button>
              </div>
              <div className="db-pawn-meter">
                {stats.active_pawn_count > 0 ? (() => {
                  const paidPct   = (stats.paid_this_month   / stats.active_pawn_count) * 100
                  const unpaidPct = (stats.unpaid_this_month / stats.active_pawn_count) * 100
                  return <>
                    <div className="db-meter-labels" style={{ marginBottom: 6 }}>
                      <span className="db-meter-label db-paid"   style={{ fontWeight: 600, fontSize: 12 }}>จ่ายแล้ว {paidPct.toFixed(0)}%</span>
                      <span className="db-meter-label db-unpaid" style={{ fontWeight: 600, fontSize: 12 }}>ยังไม่จ่าย {unpaidPct.toFixed(0)}%</span>
                    </div>
                    <div className="db-meter-bar">
                      <div className="db-meter-fill db-paid"   style={{ width: `${paidPct}%` }} />
                      <div className="db-meter-fill db-unpaid" style={{ width: `${unpaidPct}%` }} />
                    </div>
                    <div className="db-meter-labels" style={{ marginTop: 8 }}>
                      <div className="db-meter-label db-paid" style={{ fontSize: 12 }}>
                        <span className="db-dot db-dot-paid" />จ่ายแล้ว {stats.paid_this_month} ราย
                      </div>
                      <div className="db-meter-label db-unpaid" style={{ fontSize: 12 }}>
                        <span className="db-dot db-dot-unpaid" />ยังไม่จ่าย {stats.unpaid_this_month} ราย
                      </div>
                    </div>
                  </>
                })() : (
                  <div className="empty-state" style={{ padding: '16px 0' }}>
                    <div className="empty-state-text">ไม่มีรายการจำนำ</div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div className="card db-activity">
              <div className="card-header">
                <span className="card-title">รายการล่าสุด</span>
                <button className="btn btn-ghost btn-xs" onClick={() => navigate('/income')}>ดูทั้งหมด</button>
              </div>
              {(!stats.recent_activity || stats.recent_activity.length === 0) ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-text">ยังไม่มีรายการ</div>
                </div>
              ) : (
                <div className="db-activity-list">
                  {stats.recent_activity.map(e => (
                    <div key={e.id} className="db-activity-row">
                      <div className={`db-activity-dot ${e.type === 'income' ? 'db-dot-income' : 'db-dot-expense'}`} />
                      <div className="db-activity-body">
                        <div className="db-activity-cat">{e.category}</div>
                        <div className="db-activity-date">{toBE(e.date)}</div>
                      </div>
                      <div className={`db-activity-amount ${e.type === 'income' ? 'db-income' : 'db-expense'}`}>
                        {e.type === 'income' ? '+' : '−'}{formatBaht(e.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ROW 4: Recent Active Pawns table ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">จำนำล่าสุด (Active)</span>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/pawns')}>ดูทั้งหมด</button>
          </div>
          {(!stats.recent_pawns || stats.recent_pawns.length === 0) ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-state-text">ไม่มีรายการจำนำที่ยังอยู่</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ตั๋ว</th>
                    <th>ลูกค้า</th>
                    <th>รายการ</th>
                    <th>วันจำนำ</th>
                    <th style={{ textAlign: 'right' }}>ต้นเงิน</th>
                    <th style={{ textAlign: 'right' }}>ดอก/เดือน</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_pawns.map(p => (
                    <tr key={p.id} onClick={() => navigate(`/pawns/${p.id}`)}>
                      <td><span className="pl-ticket">{formatTicket(p.ticket_number)}</span></td>
                      <td style={{ fontWeight: 500 }}>{p.customer_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.item_type}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{toBE(p.pawned_date)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                        {formatBaht(p.current_principal)}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', fontSize: 13 }}>
                        {formatBaht(p.interest_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// CHART: Gold intraday with day stepper
// ─────────────────────────────────────────────────────────────────────
function GoldLineChart({ history }) {
  const chartRef      = useRef(null)
  const chartInstance = useRef(null)

  // Unique sorted dates, capped to last 30
  const allDates = useMemo(() => {
    const seen = new Set()
    history.forEach(g => g.date && seen.add(g.date.slice(0, 10)))
    return [...seen].sort().slice(-30)
  }, [history])

  const [dayOffset, setDayOffset] = useState(0)   // 0 = most recent
  const minOffset    = -(allDates.length - 1)
  const safeOffset   = Math.max(minOffset, Math.min(0, dayOffset))
  const selectedDate = allDates[allDates.length - 1 + safeOffset] ?? null

  // Rows for the selected date, time-sorted
  const dayRows = useMemo(() => {
    if (!selectedDate) return []
    return history
      .filter(g => g.date?.slice(0, 10) === selectedDate)
      .slice()
      .sort((a, b) => (parseUpdateTime(a.update_time) ?? '').localeCompare(parseUpdateTime(b.update_time) ?? ''))
  }, [history, selectedDate])

  useEffect(() => {
    chartInstance.current?.destroy()
    chartInstance.current = null
    if (!chartRef.current || dayRows.length === 0) return

    const labels   = dayRows.map(g => parseUpdateTime(g.update_time) ?? g.update_time)
    const sellData = dayRows.map(g => g.sell_price_per_baht)
    const buyData  = dayRows.map(g => g.buy_price_per_baht)

    const allPrices = [...sellData, ...buyData].filter(Boolean)
    const minP = Math.min(...allPrices)
    const maxP = Math.max(...allPrices)
    const diff = maxP - minP
    const pad  = Math.max(diff * 0.1, 20) // Tight padding
    const yMin = minP - pad
    const yMax = maxP + pad

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'ขาย',
            data: sellData,
            borderColor: '#C8963C',
            backgroundColor: 'rgba(200,150,60,0.08)',
            borderWidth: 2,
            pointRadius: dayRows.length <= 8 ? 4 : 0,
            pointHoverRadius: 5,
            pointBackgroundColor: '#C8963C',
            fill: true,
            tension: 0.35,
          },
          {
            label: 'รับซื้อ',
            data: buyData,
            borderColor: '#5BAF82',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: dayRows.length <= 8 ? 4 : 0,
            pointHoverRadius: 5,
            pointBackgroundColor: '#5BAF82',
            fill: false,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 180 },
        interaction: { mode: 'index', intersect: false },
        layout: {
          padding: {
            left: 8,
            right: 8,
            top: 8,
            bottom: 4
          }
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              font: { family: "'Sarabun', sans-serif", size: 11 },
              color: '#8B8074',
              boxWidth: 20,
              boxHeight: 2,
              padding: 10,
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ฿${ctx.parsed.y.toLocaleString('th-TH')}`,
            },
            bodyFont: { family: "'Sarabun', sans-serif" },
            titleFont: { family: "'Sarabun', sans-serif" },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Sarabun', sans-serif", size: 10 }, color: '#8B8074', maxTicksLimit: 8, maxRotation: 0 },
          },
          y: {
            min: Math.floor(yMin / 10) * 10,
            max: Math.ceil(yMax / 10) * 10,
            grid: { color: '#EDE6D8', z: -1 },
            border: { display: false },
            ticks: {
              font: { family: "'Sarabun', sans-serif", size: 10 },
              color: '#8B8074',
              padding: 8,
              callback: v => {
                const decimals = Math.round(v) % 100 === 0 ? 1 : 2
                return (v / 1000).toFixed(decimals) + 'k'
              },
            },
          },
        },
      },
    })

    return () => { chartInstance.current?.destroy(); chartInstance.current = null }
  }, [dayRows])

  return (
    <div className="card db-chart-card">
      <div className="card-header">
        <span className="card-title">ราคาทองรายวัน</span>
        <div className="db-gold-stepper">
          <button className="db-stepper-btn" disabled={safeOffset <= minOffset}
            onClick={() => setDayOffset(o => o - 1)} title="วันก่อนหน้า">
            <IconChevronLeft />
          </button>
          <span className="db-stepper-label">
            {selectedDate ? formatDayLabel(selectedDate) : '—'}
          </span>
          <button className="db-stepper-btn" disabled={safeOffset >= 0}
            onClick={() => setDayOffset(o => o + 1)} title="วันถัดไป">
            <IconChevronRight />
          </button>
        </div>
      </div>
      <div className="db-chart-body">
        {dayRows.length === 0
          ? <div className="empty-state" style={{ height: '100%' }}><div className="empty-state-text">ไม่มีข้อมูล</div></div>
          : <>
              {/* Added dedicated wrapper for Chart.js */}
              <div className="db-chart-canvas-wrap">
                <canvas ref={chartRef} />
              </div>
              <div className="db-gold-footer">
                {dayRows.length} รายการ · ล่าสุด {parseUpdateTime(dayRows.at(-1)?.update_time) ?? '—'} น.
              </div>
            </>
        }
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// CHART: Monthly Income vs Expense (Bar)
// ─────────────────────────────────────────────────────────────────────
function MonthlyChart({ data }) {
  const chartRef      = useRef(null)
  const chartInstance = useRef(null)
  const visible       = data.slice(-7)

  useEffect(() => {
    chartInstance.current?.destroy()
    chartInstance.current = null
    if (!chartRef.current) return

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: visible.map(d => d.label),
        datasets: [
          {
            label: 'รายรับ',
            data: visible.map(d => d.income),
            backgroundColor: 'rgba(91,175,130,0.75)',
            borderRadius: 3,
            borderSkipped: false,
          },
          {
            label: 'รายจ่าย',
            data: visible.map(d => d.expense),
            backgroundColor: 'rgba(212,92,92,0.65)',
            borderRadius: 3,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top', align: 'end',
            labels: { font: { family: "'Sarabun', sans-serif", size: 11 }, color: '#8B8074', boxWidth: 10, boxHeight: 10, padding: 10 },
          },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ฿${ctx.parsed.y.toLocaleString('th-TH')}` },
            bodyFont: { family: "'Sarabun', sans-serif" },
            titleFont: { family: "'Sarabun', sans-serif" },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Sarabun', sans-serif", size: 10 }, color: '#8B8074', maxRotation: 0 },
          },
          y: {
            grid: { color: '#EDE6D8', z: -1 },
            border: { display: false },
            ticks: {
              font: { family: "'Sarabun', sans-serif", size: 10 },
              color: '#8B8074',
              padding: 6,
              callback: v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v,
            },
          },
        },
      },
    })

    return () => { chartInstance.current?.destroy(); chartInstance.current = null }
  }, [data])

  return (
    <div className="card db-chart-card">
      <div className="card-header">
        <span className="card-title">รายรับ–รายจ่าย 7 วัน</span>
      </div>
      <div className="db-chart-body">
        {/* Added dedicated wrapper for Chart.js */}
        <div className="db-chart-canvas-wrap">
          <canvas ref={chartRef} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// CHART: Today Doughnut
// ─────────────────────────────────────────────────────────────────────
function TodayDoughnut({ summary }) {
  const chartRef      = useRef(null)
  const chartInstance = useRef(null)
  const { income, expense } = summary
  const net     = income - expense
  const hasData = income > 0 || expense > 0

  useEffect(() => {
    chartInstance.current?.destroy()
    chartInstance.current = null
    if (!chartRef.current) return

    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: ['รายรับ', 'รายจ่าย'],
        datasets: [{
          data: hasData ? [income, expense] : [1, 0],
          backgroundColor: hasData
            ? ['rgba(91,175,130,0.85)', 'rgba(212,92,92,0.75)']
            : ['#EDE6D8', '#EDE6D8'],
          borderWidth: 0,
          hoverOffset: hasData ? 6 : 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: hasData,
            callbacks: { label: ctx => ` ${ctx.label}: ฿${ctx.parsed.toLocaleString('th-TH')}` },
            bodyFont: { family: "'Sarabun', sans-serif" },
          },
        },
      },
    })

    return () => { chartInstance.current?.destroy(); chartInstance.current = null }
  }, [income, expense, hasData])

  return (
    <div className="card db-chart-card db-donut-card">
      <div className="card-header">
        <span className="card-title">วันนี้</span>
      </div>
      <div className="db-donut-body">
        <div className="db-donut-wrap">
          <canvas ref={chartRef} />
          <div className="db-donut-center">
            <div className={`db-donut-net ${net >= 0 ? 'db-income' : 'db-expense'}`}>
              {net >= 0 ? '+' : '−'}฿{Math.abs(net).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </div>
            <div className="db-donut-sub">สุทธิ</div>
          </div>
        </div>
        <div className="db-donut-legend">
          <div className="db-donut-legend-row">
            <span className="db-donut-dot" style={{ background: 'var(--green)' }} />
            <span className="db-donut-legend-label">รายรับ</span>
            <span className="db-donut-legend-val db-income">{formatBaht(income)}</span>
          </div>
          <div className="db-donut-legend-row">
            <span className="db-donut-dot" style={{ background: 'var(--red)' }} />
            <span className="db-donut-legend-label">รายจ่าย</span>
            <span className="db-donut-legend-val db-expense">{formatBaht(expense)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// LIST: Unpaid Pawns
// ─────────────────────────────────────────────────────────────────────
function UnpaidPawnList({ pawns, onNavigate }) {
  return (
    <div className="card db-unpaid-card">
      <div className="card-header">
        <span className="card-title">ค้างชำระดอกเบี้ย</span>
        {pawns.length > 0 && <span className="badge badge-red">{pawns.length} ราย</span>}
      </div>

      {pawns.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <div className="empty-state-icon">✓</div>
          <div className="empty-state-text">ไม่มีค้างชำระ</div>
        </div>
      ) : (
        <div className="db-unpaid-list">
          {pawns.map((p, index) => {
            const avClass = AVATAR_CLASSES[(p.customer_id || index) % AVATAR_CLASSES.length]
            return (
              <div key={p.id} className="db-unpaid-row" onClick={() => onNavigate(`/pawns/${p.id}`)}>
                <div className="db-unpaid-left-group">
                  <div className={`cl-avatar ${avClass}`}>{getCustomerInitials(p.customer_name)}</div>
                  <div className="db-unpaid-left">
                    <div className="db-unpaid-ticket">{formatTicket(p.ticket_number)}</div>
                    <div className="db-unpaid-name">{p.customer_name}</div>
                    <div className="db-unpaid-item">{p.item_type}</div>
                  </div>
                </div>
                <div className="db-unpaid-right">
                  <div className="db-unpaid-principal">{formatBaht(p.current_principal)}</div>
                  <div className={`db-unpaid-overdue ${p.overdueMonths >= 3 ? 'db-overdue-critical' : ''}`}>
                    ค้าง {p.overdueMonths} เดือน
                  </div>
                  <div className="db-unpaid-interest">ดอก {formatBaht(p.interest_amount)}/เดือน</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Icons ──────────────────────────────────────────────────────────── */
function IconRefresh()      { return <FontAwesomeIcon icon={faRotateRight} style={{ fontSize: 13 }} /> }
function IconPawn()         { return <FontAwesomeIcon icon={faBox} style={{ fontSize: 16 }} /> }
function IconCash()         { return <FontAwesomeIcon icon={faCoins} style={{ fontSize: 16 }} /> }
function IconIncome()       { return <FontAwesomeIcon icon={faArrowUp} style={{ fontSize: 16 }} /> }
function IconExpense()      { return <FontAwesomeIcon icon={faArrowDown} style={{ fontSize: 16 }} /> }
function IconChevronLeft()  { return <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 11 }} /> }
function IconChevronRight() { return <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11 }} /> }