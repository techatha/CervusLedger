import { useState, useEffect, useCallback } from 'react'
import { GetTodayPrice, ForceScrapePrice } from '../../../wailsjs/go/handlers/GoldPriceHandler.js'
import NewSaleForm from './NewSaleForm'
import './SalesList.css'

export default function SalesList() {
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(null) // null | 'sell' | 'buy'
  const [price, setPrice] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  const loadPrice = useCallback(async () => {
    setPriceLoading(true)
    setError(null)
    try {
      const p = await GetTodayPrice()
      setPrice(p)
      if (p && p.update_time) {
        setLastUpdated(p.update_time)
      } else {
        const d = new Date()
        setLastUpdated(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`)
      }
    } catch (e) {
      setError('โหลดราคาทองไม่สำเร็จ: ' + e)
    } finally {
      setPriceLoading(false)
    }
  }, [])

  const handleForceRefresh = useCallback(async () => {
    setPriceLoading(true)
    setError(null)
    try {
      const p = await ForceScrapePrice()
      setPrice(p)
      if (p && p.update_time) {
        setLastUpdated(p.update_time)
      } else {
        const d = new Date()
        setLastUpdated(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`)
      }
    } catch (e) {
      setError('โหลดราคาทองไม่สำเร็จ: ' + e)
    } finally {
      setPriceLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrice()
  }, [loadPrice])


  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">จุดทำรายการ (Cashier)</div>
          <div className="page-meta">
            ทำรายการรับซื้อ ขายทอง และชำระดอกเบี้ย
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowForm('buy')}>
            <IconDown /> รับซื้อทอง
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm('sell')}>
            <IconUp /> ขายทอง
          </button>
        </div>
      </div>

      {/* ── PREMIUM MARKET PRICE DASHBOARD ── */}
      <div className="market-price-container">
        <div className="market-price-header">
          <span className="market-price-title-text">ราคาทองสมาคมวันนี้ (96.5%)</span>
          <button
            className={`price-refresh-btn ${priceLoading ? 'spinning' : ''}`}
            onClick={handleForceRefresh}
            disabled={priceLoading}
          >
            <IconSync /> อัปเดทล่าสุด {lastUpdated || '—'}
          </button>
        </div>

        <div className="market-grid">
          {/* Gold Bar Column */}
          <div className="market-col">
            <div className="market-col-header text-gold-bar">
              <IconGoldBar /> ทองคำแท่ง
            </div>
            <div className="price-row">
              <span className="price-lbl">ขายออก</span>
              <span className="price-val sell-color">
                {price && price.sell_price_per_baht > 0
                  ? price.sell_price_per_baht.toLocaleString('th-TH')
                  : '—'}
              </span>
            </div>
            <div className="price-row">
              <span className="price-lbl">รับซื้อ</span>
              <span className="price-val buy-color">
                {price && price.buy_price_per_baht > 0
                  ? price.buy_price_per_baht.toLocaleString('th-TH')
                  : '—'}
              </span>
            </div>
          </div>

          {/* Gold Ornament Column */}
          <div className="market-col">
            <div className="market-col-header text-gold-ornament">
              <IconNecklace /> ทองรูปพรรณ
            </div>
            <div className="price-row">
              <span className="price-lbl">ขายออก</span>
              <span className="price-val sell-color">
                {/* Now using the REAL API value for ornament sell */}
                {price && price.om_sell_price > 0
                  ? price.om_sell_price.toLocaleString('th-TH')
                  : '—'}
              </span>
            </div>
            <div className="price-row">
              <span className="price-lbl">รับซื้อฐานภาษี</span>
              <span className="price-val buy-color">
                {/* Now using the REAL API value for ornament buy */}
                {price && price.om_buy_price > 0
                  ? price.om_buy_price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Checkout Form Modal */}
      {showForm && (
        <NewSaleForm
          defaultType={showForm}
          todayPrice={price}
          onSaved={() => { setShowForm(null); loadPrice() }}
          onClose={() => setShowForm(null)}
        />
      )}
    </div>
  )
}

function IconDown() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg> }
function IconUp() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> }
function IconEdit() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> }
function IconGold() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M9 9h6M9 12h6M9 15h4" /></svg> }
// ─── Inline SVG Icons (Matching your exact palette & style) ───

function IconGoldBar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 4 4 8 12 12 20 8 12 4" />
      <polyline points="4 8 4 16 12 20 20 16 20 8" />
      <line x1="12" y1="12" x2="12" y2="20" />
    </svg>
  )
}

function IconNecklace() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Chain */}
      <path d="M5 3c0 6.627 3.134 12 7 12s7-5.373 7-12" />
      {/* Pendant */}
      <circle cx="12" cy="18" r="3" />
      <path d="M12 15v-1" />
    </svg>
  )
}

function IconSync() {
  // Two circular arrows chasing each other
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21v-5h5" />
    </svg>
  )
}
