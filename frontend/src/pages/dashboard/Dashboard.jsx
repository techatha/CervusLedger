import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GetDashboardStats } from '../../../wailsjs/go/handlers/DashboardHandler'
import { UpsertTodayPrice } from '../../../wailsjs/go/handlers/GoldPriceHandler'
import { toBE, formatBaht, formatTicket, pawnStatusBadge } from '../../utils/thai'
import './Dashboard.css'

export default function Dashboard() {
  const navigate  = useNavigate()
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [editPrice, setEditPrice] = useState(false)
  const [priceForm, setPriceForm] = useState({ buy: '', sell: '' })
  const [savingPrice, setSavingPrice] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await GetDashboardStats()
      setStats(data)
      setPriceForm({
        buy:  String(data.today_price?.buy_price_per_baht  || ''),
        sell: String(data.today_price?.sell_price_per_baht || ''),
      })
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSavePrice = async () => {
    const buy  = parseFloat(priceForm.buy)
    const sell = parseFloat(priceForm.sell)
    if (!buy || !sell) return
    setSavingPrice(true)
    try {
      await UpsertTodayPrice(buy, sell)
      setEditPrice(false)
      load()
    } catch (e) {
      setError('บันทึกราคาไม่สำเร็จ: ' + e)
    } finally {
      setSavingPrice(false)
    }
  }

  const nowBE = () => {
    const d = new Date()
    const thaiDays = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
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
        {/* ── Gold Price Bar ── */}
        <div className="card db-price-bar">
          <div className="db-price-left">
            <IconGold />
            <div>
              <div className="db-price-heading">ราคาทองวันนี้</div>
              <div className="db-price-date">{toBE(stats.today_price?.date)}</div>
            </div>
          </div>

          {!editPrice ? (
            <div className="db-price-values">
              <div className="db-price-item">
                <span className="db-price-type db-sell">ขาย</span>
                <span className="db-price-num">
                  {stats.today_price?.sell_price_per_baht?.toLocaleString('th-TH') || '—'}
                </span>
                <span className="db-price-unit">฿/บาท</span>
              </div>
              <div className="db-price-div" />
              <div className="db-price-item">
                <span className="db-price-type db-buy">รับซื้อ</span>
                <span className="db-price-num">
                  {stats.today_price?.buy_price_per_baht?.toLocaleString('th-TH') || '—'}
                </span>
                <span className="db-price-unit">฿/บาท</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditPrice(true)}>
                <IconEdit /> แก้ไข
              </button>
            </div>
          ) : (
            <div className="db-price-edit">
              <label className="db-price-type db-sell">ขาย</label>
              <input
                className="input db-price-input"
                type="number"
                value={priceForm.sell}
                onChange={e => setPriceForm(p => ({ ...p, sell: e.target.value }))}
                autoFocus
              />
              <label className="db-price-type db-buy">รับซื้อ</label>
              <input
                className="input db-price-input"
                type="number"
                value={priceForm.buy}
                onChange={e => setPriceForm(p => ({ ...p, buy: e.target.value }))}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSavePrice} disabled={savingPrice}>
                {savingPrice ? '...' : 'บันทึก'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditPrice(false)}>ยกเลิก</button>
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div className="db-stats">
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
              <div className="empty-state" style={{ padding:'24px 0' }}>
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
            <div className="empty-state" style={{ padding:'24px 0' }}>
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
                    <th style={{ textAlign:'right' }}>ต้นเงิน</th>
                    <th style={{ textAlign:'right' }}>ดอก/เดือน</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_pawns.map(p => (
                    <tr key={p.id} onClick={() => navigate(`/pawns/${p.id}`)}>
                      <td><span className="pl-ticket">{formatTicket(p.ticket_number)}</span></td>
                      <td style={{ fontWeight:500 }}>{p.customer_name}</td>
                      <td style={{ color:'var(--text-secondary)' }}>{p.item_type}</td>
                      <td style={{ color:'var(--text-muted)', fontSize:13 }}>{toBE(p.pawned_date)}</td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>
                        {formatBaht(p.current_principal)}
                      </td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--text-secondary)', fontSize:13 }}>
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

/* ─── Stat Card ────────────────────────────────────────────────────── */
function StatCard({ label, value, unit, sub, color, icon, onClick }) {
  const colors = {
    gold:  { bg:'var(--bg-hover)',  border:'var(--border)',                  text:'var(--gold)'  },
    green: { bg:'var(--green-bg)', border:'rgba(61,154,104,0.2)',            text:'var(--green)' },
    blue:  { bg:'var(--blue-bg)',  border:'rgba(61,114,170,0.2)',            text:'var(--blue)'  },
    red:   { bg:'var(--red-bg)',   border:'rgba(192,72,72,0.2)',             text:'var(--red)'   },
  }
  const c = colors[color] || colors.gold
  return (
    <div
      className="db-stat-card"
      style={{ background:c.bg, border:`1px solid ${c.border}`, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="db-stat-top">
        <div className="db-stat-icon" style={{ color:c.text }}>{icon}</div>
        <div className="db-stat-label">{label}</div>
      </div>
      <div className="db-stat-value" style={{ color:c.text }}>
        {value}
        {unit && <span className="db-stat-unit">{unit}</span>}
      </div>
      {sub && <div className="db-stat-sub">{sub}</div>}
    </div>
  )
}

/* ─── Icons ────────────────────────────────────────────────────────── */
function IconRefresh() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> }
function IconGold()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h6M9 12h6M9 15h4"/></svg> }
function IconEdit()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconPawn()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> }
function IconCash()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> }
function IconIncome()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
function IconExpense() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> }
