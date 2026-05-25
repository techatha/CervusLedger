import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GetDashboardStats } from 'wailsjs/go/handlers/DashboardHandler'
import { toBE, formatBaht, formatTicket } from '@/utils/thai'
import GoldPriceDashboard from '@/components/GoldPriceDashboard'
import StatCard from '@/components/StatCard'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const priceDashboardRef = useRef()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await GetDashboardStats()
      setStats(data)
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const nowBE = () => {
    const d = new Date()
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    return `วัน${thaiDays[d.getDay()]}ที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`
  }

  if (loading) return (
    <div className="page-view">
      <div className="empty-state"><div className="empty-state-text">กำลังโหลด...</div></div>
    </div>
  )

  return (
    <div className="page-view">
      {/* Header */}
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
        {/* ── Top Row Layout: Gold Price + 4 Stat Cards ── */}
        <div className="db-top-section">
          {/* Left Side: Gold Price */}
          <div className="db-price-col">
            <GoldPriceDashboard ref={priceDashboardRef} />
          </div>

          {/* Right Side: 4 Stat Cards aligned like a window (2x2) */}
          <div className="db-stats-window">
            <StatCard
              label="จำนำคงค้าง"
              value={stats.active_pawn_count}
              unit="รายการ"
              sub={`ยอดรวม ${formatBaht(stats.active_pawn_principal)}`}
              color="gold"
              icon={<IconPawn />}
              onClick={() => navigate('/pawns')}
            />
            <StatCard
              label="ดอกเบี้ยเดือนนี้"
              value={formatBaht(stats.month_interest_collected)}
              sub={`จ่ายแล้ว ${stats.paid_this_month} ราย · ค้าง ${stats.unpaid_this_month} ราย`}
              color="green"
              icon={<IconCash />}
              onClick={() => navigate('/income')}
            />
            <StatCard
              label="รายรับวันนี้"
              value={formatBaht(stats.today_income)}
              sub={stats.today_new_pawns > 0 ? `จำนำใหม่ ${stats.today_new_pawns} ราย` : 'ไม่มีจำนำใหม่'}
              color="blue"
              icon={<IconIncome />}
              onClick={() => navigate('/income')}
            />
            <StatCard
              label="รายจ่ายวันนี้"
              value={formatBaht(stats.today_expense)}
              sub={`สุทธิ ${formatBaht(stats.today_income - stats.today_expense)}`}
              color={stats.today_income - stats.today_expense >= 0 ? 'green' : 'red'}
              icon={<IconExpense />}
              onClick={() => navigate('/income')}
            />
          </div>
        </div>

        {/* ── Pawn Payment Status ── */}
        <div className="db-mid">
          <div className="card db-pawn-status">
            <div className="card-header">
              <span className="card-title">สถานะดอกเบี้ย เดือนนี้</span>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate('/pawns?status=active')}>
                ดูทั้งหมด
              </button>
            </div>
            <div className="db-pawn-meter">
              <div className="db-meter-bar">
                {stats.active_pawn_count > 0 && (
                  <div
                    className="db-meter-fill"
                    style={{ width: `${(stats.paid_this_month / stats.active_pawn_count) * 100}%` }}
                  />
                )}
              </div>
              <div className="db-meter-labels">
                <div className="db-meter-label db-paid">
                  <span className="db-dot db-dot-paid" />
                  จ่ายแล้ว {stats.paid_this_month} ราย
                </div>
                <div className="db-meter-label db-unpaid">
                  <span className="db-dot db-dot-unpaid" />
                  ยังไม่จ่าย {stats.unpaid_this_month} ราย
                </div>
              </div>
            </div>
          </div>

          {/* ── Recent Activity ── */}
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

        {/* ── Recent Active Pawns ── */}
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


/* ─── Icons ────────────────────────────────────────────────────────── */
function IconRefresh() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg> }
function IconPawn() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg> }
function IconCash() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg> }
function IconIncome() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> }
function IconExpense() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg> }
