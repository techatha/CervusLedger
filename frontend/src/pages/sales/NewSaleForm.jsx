import { useState, useEffect, useRef } from 'react'
import { CreateSale } from '../../../wailsjs/go/handlers/SaleHandler.js'
import { ListGoldItems } from '../../../wailsjs/go/handlers/GoldItemHandler.js'
import { GetCustomers } from '../../../wailsjs/go/handlers/CustomerHandler.js'
import { formatBaht, fullName } from '../../utils/thai'
import './NewSaleForm.css'

const today = () => new Date().toISOString().slice(0, 10)

const BLANK_SELL = {
  gold_item_id:   0,
  gold_item_label:'',
  gold_item_weight: 0,
  customer_id:    0,
  customer_label: '',
  price_per_baht: '',
  notes:          '',
  date:           today(),
}

const BLANK_BUY = {
  item_type:      '',
  purity:         '96.5%',
  description:    '',
  weight_baht:    '',
  customer_id:    0,
  customer_label: '',
  price_per_baht: '',
  notes:          '',
  date:           today(),
}

// ── NEW BLANK STATE FOR DISCOUNT MODE ──
const BLANK_DISCOUNT = {
  title:          'ส่วนลดพิเศษ',
  amount:         '',
  notes:          '',
  date:           today(),
}

const PURITIES = ['96.5%', '99.9%', '99.99%', '90%', 'อื่นๆ']

export default function NewSaleForm({ defaultType, todayPrice, onSaved, onClose, onAdd }) {
  // Enhanced to support 3 distinct modes: 'sell' | 'buy' | 'discount'
  const [tab,    setTab]    = useState(defaultType || 'sell') 
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  // Form states
  const [sell, setSell] = useState({
    ...BLANK_SELL,
    price_per_baht: todayPrice ? String(todayPrice.sell_price_per_baht) : '',
  })

  const [buy, setBuy] = useState({
    ...BLANK_BUY,
    price_per_baht: todayPrice ? String(todayPrice.buy_price_per_baht) : '',
  })

  // ── NEW DISCOUNT STATE ──
  const [discount, setDiscount] = useState({ ...BLANK_DISCOUNT })

  // Gold item picker (sell tab)
  const [goldItems,      setGoldItems]      = useState([])
  const [goldSearch,     setGoldSearch]     = useState('')
  const [showGoldDrop,   setShowGoldDrop]   = useState(false)
  const goldRef = useRef(null)

  // Customer picker
  const [customers,     setCustomers]     = useState([])
  const [custSearch,    setCustSearch]    = useState('')
  const [showCustDrop,  setShowCustDrop]  = useState(false)
  const custRef = useRef(null)

  // Load available gold items for sell tab
  useEffect(() => {
    if (tab === 'sell') {
      ListGoldItems('available').then(d => setGoldItems(d || []))
    }
  }, [tab])

  // Filter gold items by search
  const filteredGold = goldItems.filter(g =>
    !goldSearch ||
    g.type.includes(goldSearch) ||
    (g.description || '').includes(goldSearch)
  )

  // Customer autocomplete
  useEffect(() => {
    if (!custSearch) { setCustomers([]); return }
    const t = setTimeout(() => {
      GetCustomers(custSearch).then(d => setCustomers(d || []))
    }, 200)
    return () => clearTimeout(t)
  }, [custSearch])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (goldRef.current && !goldRef.current.contains(e.target)) setShowGoldDrop(false)
      if (custRef.current && !custRef.current.contains(e.target)) setShowCustDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Live total calculation adjustments
  const sellTotal = sell.gold_item_weight && sell.price_per_baht
    ? sell.gold_item_weight * parseFloat(sell.price_per_baht || 0)
    : 0

  const buyTotal = buy.weight_baht && buy.price_per_baht
    ? parseFloat(buy.weight_baht) * parseFloat(buy.price_per_baht || 0)
    : 0

  // ── NEW LIVE DISCOUNT TOTAL ──
  const discountTotal = discount.amount ? parseFloat(discount.amount || 0) : 0

  const setSellField     = (k, v) => setSell(p => ({ ...p, [k]: v }))
  const setBuyField      = (k, v) => setBuy(p => ({ ...p, [k]: v }))
  const setDiscountField = (k, v) => setDiscount(p => ({ ...p, [k]: v }))

  const selectGoldItem = (item) => {
    setSell(p => ({
      ...p,
      gold_item_id:    item.id,
      gold_item_label: `${item.type} — ${item.weight_baht} บาท${item.purity ? ` (${item.purity})` : ''}`,
      gold_item_weight: item.weight_baht,
    }))
    setGoldSearch(item.type)
    setShowGoldDrop(false)
  }

  const selectCustomer = (c) => {
    const name = fullName(c)
    if (tab === 'sell') {
      setSell(p => ({ ...p, customer_id: c.id, customer_label: name }))
    } else if (tab === 'buy') {
      setBuy(p => ({ ...p, customer_id: c.id, customer_label: name }))
    }
    setCustSearch(name)
    setShowCustDrop(false)
    setCustomers([])
  }

  const clearCustomer = () => {
    if (tab === 'sell') setSell(p => ({ ...p, customer_id: 0, customer_label: '' }))
    else if (tab === 'buy') setBuy(p => ({ ...p, customer_id: 0, customer_label: '' }))
    setCustSearch('')
  }

  const handleTabChange = (t) => {
    setTab(t)
    setError(null)
    setCustSearch('')
    setGoldSearch('')
    if (todayPrice) {
      if (t === 'sell') setSellField('price_per_baht', String(todayPrice.sell_price_per_baht))
      else if (t === 'buy') setBuyField('price_per_baht',  String(todayPrice.buy_price_per_baht))
    }
  }

  const handleSave = async () => {
    setError(null)
    
    // Validation rules per tab mode
    if (tab === 'sell') {
      if (!sell.gold_item_id)    { setError('กรุณาเลือกรายการทองที่จะขาย'); return }
      if (!sell.price_per_baht)  { setError('กรุณากรอกราคา/บาท'); return }
    } else if (tab === 'buy') {
      if (!buy.item_type.trim()) { setError('กรุณากรอกประเภททอง'); return }
      if (!buy.weight_baht)      { setError('กรุณากรอกน้ำหนัก'); return }
      if (!buy.price_per_baht)   { setError('กรุณากรอกราคา/บาท'); return }
    } else if (tab === 'discount') {
      if (!discount.title.trim()) { setError('กรุณากรอกหัวข้อส่วนลด'); return }
      if (!discount.amount || parseFloat(discount.amount) <= 0) { setError('กรุณากรอกมูลค่าส่วนลดให้ถูกต้อง'); return }
    }

    setSaving(true)
    try {
      const priceID = todayPrice?.id || 0
      let payload = {}
      let label = ''

      if (tab === 'sell') {
        payload = {
          type:          'sell',
          customer_id:   sell.customer_id,
          gold_item_id:  sell.gold_item_id,
          weight_baht:   sell.gold_item_weight,
          gold_price_id: priceID,
          price_per_baht: parseFloat(sell.price_per_baht),
          total_amount:  sellTotal,
          notes:         sell.notes,
          date:          sell.date,
          item_type: '', purity: '', description: '',
        }
        label = sell.gold_item_label
      } else if (tab === 'buy') {
        payload = {
          type:          'buy',
          customer_id:   buy.customer_id,
          gold_item_id:  0,
          weight_baht:   parseFloat(buy.weight_baht),
          gold_price_id: priceID,
          price_per_baht: parseFloat(buy.price_per_baht),
          total_amount:  buyTotal,
          notes:         buy.notes,
          date:          buy.date,
          item_type:     buy.item_type,
          purity:        buy.purity,
          description:   buy.description,
        }
        label = `${buy.item_type} ${buy.purity}${buy.description ? ` (${buy.description})` : ''}`
      } else if (tab === 'discount') {
        // Formulating the generic deduction payload object for the cashier map queue
        payload = {
          type:          'discount',
          customer_id:   0,
          gold_item_id:  0,
          weight_baht:   0,
          gold_price_id: priceID,
          price_per_baht: 0,
          // Storing as a negative value or letting your main reduce sum logic handle operational subtractions
          total_amount:  discountTotal, 
          notes:         discount.notes,
          date:          discount.date,
          item_type: '', purity: '', description: '',
        }
        label = discount.title
      }

      if (onAdd) {
        onAdd({
          ...payload,
          label,
          // Passing secondary values so details render correctly under the table index description
          notes: tab === 'discount' ? discount.notes : payload.notes 
        })
      } else {
        // Direct save fallback configuration
        await CreateSale(payload)
        onSaved()
      }
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  const custLabel = tab === 'sell' ? sell.customer_label : buy.customer_label
  const custID    = tab === 'sell' ? sell.customer_id    : buy.customer_id

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal nsf-modal" onClick={e => e.stopPropagation()}>

        {/* ── THREE MODES TAB HEADER ── */}
        <div className="nsf-tab-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button
            className={`nsf-tab ${tab === 'sell' ? 'nsf-tab-active nsf-tab-sell' : ''}`}
            onClick={() => handleTabChange('sell')}
          >
            <IconUp /> ขายทอง
          </button>
          <button
            className={`nsf-tab ${tab === 'buy' ? 'nsf-tab-active nsf-tab-buy' : ''}`}
            onClick={() => handleTabChange('buy')}
          >
            <IconDown /> รับซื้อทอง
          </button>
          <button
            className={`nsf-tab ${tab === 'discount' ? 'nsf-tab-active nsf-tab-discount' : ''}`}
            onClick={() => handleTabChange('discount')}
            style={tab === 'discount' ? { borderBottomColor: 'var(--blue)', color: 'var(--blue)' } : {}}
          >
            <IconTag /> เพิ่มส่วนลด
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* ── SELL TAB ── */}
          {tab === 'sell' && (
            <>
              <div className="section-divider">รายการทอง</div>
              <div className="form-group" ref={goldRef} style={{ position:'relative' }}>
                <label className="form-label form-label-required">เลือกรายการทอง (สต็อก)</label>
                <input
                  className="input"
                  placeholder="ค้นหาประเภทหรือรายละเอียด..."
                  value={goldSearch}
                  onChange={e => { setGoldSearch(e.target.value); setShowGoldDrop(true); setSell(p=>({...p,gold_item_id:0,gold_item_weight:0})) }}
                  onFocus={() => setShowGoldDrop(true)}
                  autoFocus
                />
                {sell.gold_item_id > 0 && (
                  <div className="nsf-selected-item">
                    <IconCheck /> {sell.gold_item_label}
                  </div>
                )}
                {showGoldDrop && filteredGold.length > 0 && (
                  <div className="nsf-dropdown">
                    {filteredGold.map(g => (
                      <div key={g.id} className="nsf-drop-item" onMouseDown={() => selectGoldItem(g)}>
                        <div className="nsf-drop-main">
                          <span className="nsf-drop-name">{g.type}</span>
                          {g.purity && <span className="badge badge-gold" style={{fontSize:11}}>{g.purity}</span>}
                        </div>
                        <span className="nsf-drop-weight">{g.weight_baht} บาท</span>
                        {g.description && <span className="nsf-drop-desc">{g.description}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {sell.gold_item_weight > 0 && (
                <div className="nsf-weight-badge">
                  น้ำหนัก: <strong>{sell.gold_item_weight} บาท</strong>
                </div>
              )}

              <div className="section-divider">ราคา</div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label form-label-required">ราคา / บาท (บาท)</label>
                  <input
                    className="input"
                    type="number"
                    value={sell.price_per_baht}
                    onChange={e => setSellField('price_per_baht', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่</label>
                  <input className="input" type="date" value={sell.date} onChange={e => setSellField('date', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── BUY TAB ── */}
          {tab === 'buy' && (
            <>
              <div className="section-divider">รายละเอียดทอง</div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label form-label-required">ประเภท</label>
                  <input
                    className="input"
                    placeholder="เช่น สร้อยคอ, แหวน"
                    value={buy.item_type}
                    onChange={e => setBuyField('item_type', e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ความบริสุทธิ์</label>
                  <select className="input" value={buy.purity} onChange={e => setBuyField('purity', e.target.value)}>
                    {PURITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">รายละเอียด</label>
                <input className="input" placeholder="ลักษณะ, ตราประทับ..." value={buy.description} onChange={e => setBuyField('description', e.target.value)} />
              </div>

              <div className="section-divider">ราคา</div>
              <div className="form-row form-row-3">
                <div className="form-group">
                  <label className="form-label form-label-required">น้ำหนัก (บาท)</label>
                  <input className="input" type="number" placeholder="0.00" min="0" step="0.0001" value={buy.weight_baht} onChange={e => setBuyField('weight_baht', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">ราคา / บาท (บาท)</label>
                  <input className="input" type="number" value={buy.price_per_baht} onChange={e => setBuyField('price_per_baht', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่</label>
                  <input className="input" type="date" value={buy.date} onChange={e => setBuyField('date', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── NEW DISCOUNT TAB PANEL ── */}
          {tab === 'discount' && (
            <>
              <div className="section-divider">รายละเอียดส่วนลด</div>
              <div className="form-group">
                <label className="form-label form-label-required">หัวข้อส่วนลด / การปรับลดราคา</label>
                <input
                  className="input"
                  placeholder="เช่น ส่วนลดพิเศษ, ปัดเศษ, ลดค่ากำเหน็จ..."
                  value={discount.title}
                  onChange={e => setDiscountField('title', e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label form-label-required">จำนวนเงินส่วนลด (บาท)</label>
                  <input 
                    className="input" 
                    type="number" 
                    placeholder="0.00" 
                    min="0" 
                    value={discount.amount} 
                    onChange={e => setDiscountField('amount', e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่ทำรายการ</label>
                  <input 
                    className="input" 
                    type="date" 
                    value={discount.date} 
                    onChange={e => setDiscountField('date', e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
                <input
                  className="input"
                  placeholder="ระบุเหตุผลการลดราคา (เช่น ลูกค้าประจำ)"
                  value={discount.notes}
                  onChange={e => setDiscountField('notes', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Shared Elements: Customer input hidden for discounts to keep it focused */}
          {tab !== 'discount' && (
            <>
              <div className="section-divider">ลูกค้า & หมายเหตุ</div>
              <div className="form-row form-row-2">
                <div className="form-group" ref={custRef} style={{ position:'relative' }}>
                  <label className="form-label">ลูกค้า (ไม่บังคับ)</label>
                  <input
                    className="input"
                    placeholder="ค้นหาชื่อหรือเบอร์..."
                    value={custSearch}
                    onChange={e => { setCustSearch(e.target.value); clearCustomer(); setShowCustDrop(true) }}
                    onFocus={() => custSearch && setShowCustDrop(true)}
                  />
                  {custID > 0 && <div className="nsf-selected-item"><IconCheck /> {custLabel}</div>}
                  {showCustDrop && customers.length > 0 && (
                    <div className="nsf-dropdown">
                      {customers.map(c => (
                        <div key={c.id} className="nsf-drop-item" onMouseDown={() => selectCustomer(c)}>
                          <span className="nsf-drop-name">{fullName(c)}</span>
                          {c.phone && <span className="nsf-drop-desc">{c.phone}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">หมายเหตุ</label>
                  <input
                    className="input"
                    placeholder="(ไม่บังคับ)"
                    value={sell.notes}
                    onChange={e => setSellField('notes', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Total view previews */}
          {(sellTotal > 0 || buyTotal > 0 || discountTotal > 0) && (
            <div className={`nsf-total ${
              tab === 'sell' ? 'nsf-total-sell' : 
              tab === 'buy' ? 'nsf-total-buy' : 'nsf-total-discount'
            }`} style={tab === 'discount' ? { background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid var(--blue)' } : {}}>
              <span className="nsf-total-label">
                {tab === 'discount' ? 'ยอดลดราคาหลุดจำนอง' : 'ยอดรวม'}
              </span>
              <span className="nsf-total-amount" style={tab === 'discount' ? { color: 'var(--blue)' } : {}}>
                {tab === 'discount' ? `-${formatBaht(discountTotal)}` : formatBaht(tab === 'sell' ? sellTotal : buyTotal)}
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={
              tab === 'buy' ? { background:'var(--amber)', color:'#fff', border:'none' } : 
              tab === 'discount' ? { background:'var(--blue, #3b82f6)', color:'#fff', border:'none' } : {}
            }
          >
            {saving ? 'กำลังบันทึก...' : 
             tab === 'sell' ? 'บันทึกการขาย' : 
             tab === 'buy' ? 'บันทึกการรับซื้อ' : 'เพิ่มส่วนลดลงตะกร้า'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IconUp()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
function IconDown()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> }
function IconCheck() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> }
function IconTag()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> }
