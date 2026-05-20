import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { GetTodayPrice, ForceScrapePrice, GetPriceHistory } from '../../wailsjs/go/handlers/GoldPriceHandler.js'
import { formatDate } from '../utils/date.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faJar, faRing, faArrowsRotate, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons'
import './GoldPriceDashboard.css'

const GoldPriceDashboard = forwardRef(({ onPriceLoaded }, ref) => {
  const [error, setError] = useState(null)
  const [price, setPrice] = useState(null)
  const [prevPrice, setPrevPrice] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [date, setDate] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  const loadPrice = useCallback(async () => {
    setPriceLoading(true)
    setError(null)
    try {
      const history = await GetPriceHistory(2)
      if (history && history.length > 0) {
        const p = history[0]
        setPrice(p)
        setPrevPrice(history.length > 1 ? history[1] : null)
        if (onPriceLoaded) onPriceLoaded(p)
        if (p.update_time) {
          setDate(formatDate(p.date))
          setLastUpdated(p.update_time)
        } else {
          const d = new Date()
          setDate(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`)
          setLastUpdated(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
        }
      } else {
        const p = await GetTodayPrice()
        setPrice(p)
        setPrevPrice(null)
        if (onPriceLoaded) onPriceLoaded(p)
        if (p && p.update_time) {
          setDate(formatDate(p.date))
          setLastUpdated(p.update_time)
        } else {
          const d = new Date()
          setDate(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`)
          setLastUpdated(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
        }
      }
    } catch (e) {
      setError('โหลดราคาทองไม่สำเร็จ: ' + e)
    } finally {
      setPriceLoading(false)
    }
  }, [onPriceLoaded])

  const handleForceRefresh = useCallback(async () => {
    setPriceLoading(true)
    setError(null)
    try {
      await ForceScrapePrice()
      await loadPrice()
    } catch (e) {
      setError('โหลดราคาทองไม่สำเร็จ: ' + e)
    } finally {
      setPriceLoading(false)
    }
  }, [loadPrice])

  useImperativeHandle(ref, () => ({
    refresh: loadPrice
  }))

  useEffect(() => {
    loadPrice()
  }, [loadPrice])

  const renderPriceCell = (label, curr, prev) => {
    const hasPrev = prev !== null && prev !== undefined && prev > 0
    const diff = hasPrev ? curr - prev : 0
    
    let priceColorClass = ''
    if (diff > 0) {
      priceColorClass = 'buy-color' // green
    } else if (diff < 0) {
      priceColorClass = 'sell-color' // red
    }
    
    return (
      <div className="price-row">
        <span className="price-lbl">{label}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`price-val ${priceColorClass}`}>
              {curr > 0 ? curr.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            </span>
            {curr > 0 && diff > 0 && <FontAwesomeIcon icon={faArrowUp} style={{ color: 'var(--green)', fontSize: '13px' }} />}
            {curr > 0 && diff < 0 && <FontAwesomeIcon icon={faArrowDown} style={{ color: 'var(--red)', fontSize: '13px' }} />}
          </div>
          {curr > 0 && diff !== 0 && (
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: diff > 0 ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>
              {diff > 0 ? '+' : ''}{diff.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="market-price-container">
      {error && <div className="alert alert-error" style={{ margin: '14px 20px 0' }}>{error}</div>}
      <div className="market-price-header">
        <span className="market-price-title-text">ราคาทองสมาคมวันนี้ (96.5%)</span>
        <button
          className={`price-refresh-btn ${priceLoading ? 'spinning' : ''}`}
          onClick={handleForceRefresh}
          disabled={priceLoading}
        >
          <IconSync /> อัปเดทล่าสุด {date || '—'} {lastUpdated || '—'}
        </button>
      </div>

      <div className="market-grid">
        {/* Gold Bar Column */}
        <div className="market-col">
          <div className="market-col-header text-gold-bar">
            <IconGoldBar /> ทองคำแท่ง
          </div>
          {renderPriceCell("ขายออก", price?.sell_price_per_baht, prevPrice?.sell_price_per_baht)}
          {renderPriceCell("รับซื้อ", price?.buy_price_per_baht, prevPrice?.buy_price_per_baht)}
        </div>

        {/* Gold Ornament Column */}
        <div className="market-col">
          <div className="market-col-header text-gold-ornament">
            <IconNecklace /> ทองรูปพรรณ
          </div>
          {renderPriceCell("ขายออก", price?.om_sell_price, prevPrice?.om_sell_price)}
          {renderPriceCell("รับซื้อฐานภาษี", price?.om_buy_price, prevPrice?.om_buy_price)}
        </div>
      </div>
    </div>
  )
})

GoldPriceDashboard.displayName = 'GoldPriceDashboard'

export default GoldPriceDashboard

// ─── Inline SVG / FA Wrappers ───
function IconGoldBar() {
  return <FontAwesomeIcon icon={faJar} />
}

function IconNecklace() {
  return <FontAwesomeIcon icon={faRing} />
}

function IconSync() {
  return <FontAwesomeIcon icon={faArrowsRotate} />
}
