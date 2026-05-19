import { useState, useEffect, useCallback } from 'react'
import { ListSales, } from '../../../wailsjs/go/handlers/SaleHandler.js'
// import { GetTodayPrice, UpsertTodayPrice } from '../../../wailsjs/go/handlers/GoldPriceHandler.js'
import { toBE, formatBaht } from '../../utils/thai'
import NewSaleForm from './NewSaleForm'
import './SalesList.css'

const TYPE_TABS = [
  { value: '',     label: 'ทั้งหมด' },
  { value: 'sell', label: 'ขายทอง' },
  { value: 'buy',  label: 'รับซื้อ' },
]

export default function SalesList() {
  const [sales,      setSales]      = useState([])
  const [filter,     setFilter]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [showForm,   setShowForm]   = useState(null) // null | 'sell' | 'buy'

  // Gold price state
  const [price,      setPrice]      = useState(null)
  const [editPrice,  setEditPrice]  = useState(false)
  const [priceForm,  setPriceForm]  = useState({ buy: '', sell: '' })
  const [savingPrice,setSavingPrice]= useState(false)

  const loadSales = useCallback(async (t) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ListSales(t)
      setSales(data || [])
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPrice = useCallback(async () => {
    try {
      const p = await GetTodayPrice()
      setPrice(p)
      setPriceForm({ buy: String(p.buy_price_per_baht), sell: String(p.sell_price_per_baht) })
    } catch {}
  }, [])

  useEffect(() => {
    loadSales('')
    loadPrice()
  }, [loadSales, loadPrice])

  const handleTabChange = (t) => {
    setFilter(t)
    loadSales(t)
  }

  const handleSavePrice = async () => {
    const buy  = parseFloat(priceForm.buy)
    const sell = parseFloat(priceForm.sell)
    if (!buy || !sell || buy <= 0 || sell <= 0) return
    setSavingPrice(true)
    try {
      await UpsertTodayPrice(buy, sell)
      await loadPrice()
      setEditPrice(false)
    } catch (e) {
      setError('บันทึกราคาไม่สำเร็จ: ' + e)
    } finally {
      setSavingPrice(false)
    }
  }

  // Summary
  const todaySales = sales.filter(s => s.date === new Date().toISOString().slice(0,10))
  const totalSell  = todaySales.filter(s=>s.type==='sell').reduce((a,s)=>a+s.total_amount,0)
  const totalBuy   = todaySales.filter(s=>s.type==='buy').reduce((a,s)=>a+s.total_amount,0)

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">ซื้อ-ขายทอง</div>
          <div className="page-meta">
            {!loading && `${sales.length} รายการ`}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={() => setShowForm('buy')}>
            <IconDown /> รับซื้อ
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm('sell')}>
            <IconUp /> ขายทอง
          </button>
        </div>
      </div>

      {/* Gold Price Bar */}
      <div className="sl-price-bar card">
        <div className="sl-price-bar-inner">
          <div className="sl-price-label">
            <IconGold />
            ราคาทองวันนี้
            {price && <span className="sl-price-date">{toBE(price.date)}</span>}
          </div>

          {!editPrice ? (
            <div className="sl-price-values">
              <div className="sl-price-item">
                <span className="sl-price-type sell">ขาย</span>
                <span className="sl-price-num">
                  {price ? price.sell_price_per_baht.toLocaleString('th-TH') : '—'}
                </span>
                <span className="sl-price-unit">บาท/บาท</span>
              </div>
              <div className="sl-price-divider" />
              <div className="sl-price-item">
                <span className="sl-price-type buy">รับซื้อ</span>
                <span className="sl-price-num">
                  {price ? price.buy_price_per_baht.toLocaleString('th-TH') : '—'}
                </span>
                <span className="sl-price-unit">บาท/บาท</span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditPrice(true)}
              >
                <IconEdit /> แก้ไขราคา
              </button>
            </div>
          ) : (
            <div className="sl-price-edit">
              <div className="sl-price-edit-field">
                <span className="sl-price-type sell">ขาย</span>
                <input
                  className="input sl-price-input"
                  type="number"
                  value={priceForm.sell}
                  onChange={e => setPriceForm(p=>({...p, sell: e.target.value}))}
                  autoFocus
                />
              </div>
              <div className="sl-price-edit-field">
                <span className="sl-price-type buy">รับซื้อ</span>
                <input
                  className="input sl-price-input"
                  type="number"
                  value={priceForm.buy}
                  onChange={e => setPriceForm(p=>({...p, buy: e.target.value}))}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleSavePrice} disabled={savingPrice}>
                {savingPrice ? '...' : 'บันทึก'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditPrice(false)}>
                ยกเลิก
              </button>
            </div>
          )}
        </div>

        {/* Today summary */}
        {(totalSell > 0 || totalBuy > 0) && (
          <div className="sl-today-summary">
            <span>วันนี้:</span>
            {totalSell > 0 && <span className="sl-today-sell">ขาย {formatBaht(totalSell)}</span>}
            {totalBuy  > 0 && <span className="sl-today-buy">รับซื้อ {formatBaht(totalBuy)}</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="toolbar">
        <div className="pl-tabs">
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              className={`pl-tab ${filter === t.value ? 'pl-tab-active' : ''}`}
              onClick={() => handleTabChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>ลูกค้า</th>
                <th>รายการทอง</th>
                <th style={{ textAlign:'right' }}>น้ำหนัก (บาท)</th>
                <th style={{ textAlign:'right' }}>ราคา/บาท</th>
                <th style={{ textAlign:'right' }}>ยอดรวม</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={8}>กำลังโหลด...</td></tr>
              ) : sales.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan={8}>ยังไม่มีรายการ{filter === 'sell' ? 'ขาย' : filter === 'buy' ? 'รับซื้อ' : ''}</td>
                </tr>
              ) : sales.map(s => (
                <tr key={s.id} style={{ cursor:'default' }}>
                  <td className="sl-date">{toBE(s.date)}</td>
                  <td>
                    <span className={`badge ${s.type === 'sell' ? 'badge-green' : 'badge-amber'}`}>
                      {s.type === 'sell' ? 'ขาย' : 'รับซื้อ'}
                    </span>
                  </td>
                  <td className="sl-customer">
                    {s.customer_name || <span style={{ color:'var(--text-disabled)' }}>—</span>}
                  </td>
                  <td className="sl-item">{s.gold_item_type || '—'}</td>
                  <td className="sl-num">{s.weight_baht.toLocaleString('th-TH', { maximumFractionDigits:4 })}</td>
                  <td className="sl-num">{s.total_amount && s.weight_baht ? (s.total_amount/s.weight_baht).toLocaleString('th-TH') : '—'}</td>
                  <td className={`sl-num sl-total ${s.type === 'sell' ? 'sl-income' : 'sl-expense'}`}>
                    {s.type === 'sell' ? '+' : '−'}{formatBaht(s.total_amount)}
                  </td>
                  <td className="sl-notes">{s.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <NewSaleForm
          defaultType={showForm}
          todayPrice={price}
          onSaved={() => { setShowForm(null); loadSales(filter); loadPrice() }}
          onClose={() => setShowForm(null)}
        />
      )}
    </div>
  )
}

function IconDown()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> }
function IconUp()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
function IconEdit()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconGold()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h6M9 12h6M9 15h4"/></svg> }
