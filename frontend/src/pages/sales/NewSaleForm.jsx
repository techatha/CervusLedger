import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUp, faArrowDown, faTag } from '@fortawesome/free-solid-svg-icons'
import NewSaleFormSell from './components/newSaleForm/Sell.jsx'
import NewSaleFormBuy from './components/newSaleForm/Buy.jsx'
import NewSaleFormDiscount from './components/newSaleForm/Discount.jsx'
import './NewSaleForm.css'

import { getLocalISOString } from '@/utils/date'
import { formatBaht } from '@/utils/thai.js'

const today = () => getLocalISOString().slice(0, 10)

const BLANK_SELL = {
  gold_item_id: 0, gold_item_label: '', weight_grams: '', purity: '90',
  price_per_baht: '', labor_fee: '', total_amount: '', calculated_gold_price: 0,
  customer_id: 0, customer_label: '', notes: '', date: today(),
  discount_amount: 0, // เพิ่มฟิลด์รับค่าส่วนลดจากการต่อรอง
  stock_quantity: null
}

const BLANK_BUY = {
  gold_item_id: 0, gold_item_label: '', weight_grams: '', purity: '96.5',
  price_per_baht: '', item_type: '', item_subtype: '', weight_baht: '', total_amount: '',
  is_inventory: 0, customer_id: 0, customer_label: '', notes: '', date: today(),
  is_override: false, override_diff: 0
}

const BLANK_DISCOUNT = {
  title: 'ส่วนลดพิเศษ', amount: '', notes: '', date: today()
}

export default function NewSaleForm({ defaultType, todayPrice, onClose, onAdd }) {
  const [tab, setTab] = useState(defaultType || 'sell')
  const [error, setError] = useState(null)

  // State กลางสำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState(() => {
    const initialTab = defaultType || 'sell'
    if (initialTab === 'sell') {
      return { ...BLANK_SELL, price_per_baht: todayPrice ? String(todayPrice.sell_price_per_baht) : '' }
    }
    if (initialTab === 'buy') {
      return { ...BLANK_BUY, price_per_baht: todayPrice ? String(todayPrice.buy_price_per_baht) : '' }
    }
    return BLANK_DISCOUNT
  })

  const handleTabChange = (newTab) => {
    setTab(newTab)
    setError(null)
    if (newTab === 'sell') setFormData({ ...BLANK_SELL, price_per_baht: todayPrice ? String(todayPrice.sell_price_per_baht) : '' })
    else if (newTab === 'buy') setFormData({ ...BLANK_BUY, price_per_baht: todayPrice ? String(todayPrice.buy_price_per_baht) : '' })
    else if (newTab === 'discount') setFormData({ ...BLANK_DISCOUNT })
  }

  const handleAddToCart = () => {
    setError(null)

    if (tab === 'sell') {
      if (!formData.gold_item_id) return setError('กรุณาเลือกประเภทและรุ่นของทองที่จะขาย')
      if (!formData.price_per_baht) return setError('กรุณากรอกราคาทองคำแท่งอ้างอิง')
      if (!formData.weight_grams) return setError('กรุณากรอกน้ำหนักชั่งจริง (กรัม)')
      if (!formData.total_amount) return setError('กรุณากรอกราคารวมขาย')

      const priceID = todayPrice?.id || 0
      const finalWeightBaht = parseFloat(formData.weight_grams || 0) * 656 / 10000
      const displayNotes = formData.notes
        ? `${formData.notes} [ชั่งจริง: ${formData.weight_grams} ก. (ความบริสุทธิ์: ${formData.purity}%)]`
        : `ชั่งจริง: ${formData.weight_grams} ก. (ความบริสุทธิ์: ${formData.purity}%)`

      // 1. ส่ง Payload การขาย
      onAdd({
        type: 'sell',
        customer_id: formData.customer_id,
        gold_item_id: formData.gold_item_id,
        weight_baht: finalWeightBaht,
        gold_price_id: priceID,
        price_per_baht: parseFloat(String(formData.price_per_baht).replace(/,/g, '')),
        total_amount: parseFloat(String(formData.total_amount).replace(/,/g, '') || 0),
        notes: displayNotes,
        date: formData.date,
        item_type: '', purity: '', description: '',
        label: formData.gold_item_label,
      })

      // 2. ถ้ามีการต่อรองราคา ให้ส่ง Payload ส่วนลดแยกไปด้วย
      if (formData.discount_amount > 0) {
        onAdd({
          type: 'discount',
          customer_id: formData.customer_id,
          gold_item_id: 0,
          weight_baht: 0,
          gold_price_id: priceID,
          price_per_baht: 0,
          total_amount: formData.discount_amount,
          notes: `ส่วนลดพิเศษจากการต่อรองราคารายการ: ${formData.gold_item_label}`,
          date: formData.date,
          item_type: '', purity: '', description: '',
          label: 'ส่วนลดพิเศษ',
        })
      }
      onClose()

    } else if (tab === 'buy') {
      if (!formData.customer_id) return setError('กรุณาเลือกลูกค้าสำหรับการรับซื้อทอง')
      if (!formData.item_type?.trim()) return setError('กรุณากรอกประเภททอง')
      if (!formData.weight_baht) return setError('กรุณากรอกน้ำหนัก')
      if (!formData.total_amount) return setError('กรุณากรอกราคารับซื้อรวม')

      const priceID = todayPrice?.id || 0
      onAdd({
        type: 'buy',
        customer_id: formData.customer_id,
        gold_item_id: formData.gold_item_id || 0,
        weight_baht: parseFloat(formData.weight_baht),
        weight_grams: parseFloat(formData.weight_grams || 0),
        gold_price_id: priceID,
        price_per_baht: parseFloat(String(formData.price_per_baht).replace(/,/g, '') || 0),
        total_amount: parseFloat(formData.total_amount),
        notes: formData.notes,
        date: formData.date,
        item_type: formData.item_type,
        item_subtype: formData.item_subtype || '',
        is_inventory: formData.is_inventory,
        label: `รับซื้อ: ${formData.item_type}${formData.item_subtype ? ` — ${formData.item_subtype}` : ''}${formData.weight_grams ? ` (${formData.weight_grams} กรัม)` : ''}`,
      })
      onClose()

    } else if (tab === 'discount') {
      if (!formData.title?.trim()) return setError('กรุณากรอกหัวข้อส่วนลด')
      if (!formData.amount || parseFloat(formData.amount) <= 0) return setError('กรุณากรอกมูลค่าส่วนลดให้ถูกต้อง')

      const priceID = todayPrice?.id || 0
      onAdd({
        type: 'discount',
        customer_id: 0,
        gold_item_id: 0,
        weight_baht: 0,
        gold_price_id: priceID,
        price_per_baht: 0,
        total_amount: parseFloat(formData.amount),
        notes: formData.notes,
        date: formData.date,
        item_type: '', purity: '', description: '',
        label: formData.title,
      })
      onClose()
    }
  }

  // ─── Pinned footer total ───────────────────────────────────────────
  const parseNum = (v) => parseFloat(String(v ?? '').replace(/,/g, '')) || 0

  const footerTotal = tab === 'sell'
    ? Math.max(0, parseNum(formData.total_amount) - parseNum(formData.discount_amount))
    : tab === 'buy'
      ? parseNum(formData.total_amount)
      : parseNum(formData.amount)

  const footerLabel = tab === 'sell' ? 'ยอดขายสุทธิ' : tab === 'buy' ? 'ยอดรับซื้อ' : 'ยอดส่วนลด'
  const footerColor = tab === 'sell' ? 'var(--green)' : tab === 'buy' ? 'var(--amber)' : 'var(--blue)'

  // Small contextual badge: discount applied (sell) / manual price override (buy)
  const footerBadge = (() => {
    if (tab === 'sell') {
      const d = parseNum(formData.discount_amount)
      return d > 0 ? `-${formatBaht(d)}` : null
    }
    if (tab === 'buy' && formData.is_override) {
      const diff = parseNum(formData.override_diff)
      if (diff === 0) return null
      return `${diff > 0 ? '+' : '-'}${formatBaht(Math.abs(diff))}`
    }
    return null
  })()

  // Out-of-stock notice, now pinned next to the total instead of inline in the form
  const showStockWarning = tab === 'sell'
    && formData.gold_item_id > 0
    && typeof formData.stock_quantity === 'number'
    && formData.stock_quantity <= 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal nsf-modal" onClick={e => e.stopPropagation()}>
        <div className="nsf-tab-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button className={`nsf-tab ${tab === 'sell' ? 'nsf-tab-active nsf-tab-sell' : ''}`} onClick={() => handleTabChange('sell')}>
            <FontAwesomeIcon icon={faArrowUp} /> ขายทอง
          </button>
          <button className={`nsf-tab ${tab === 'buy' ? 'nsf-tab-active nsf-tab-buy' : ''}`} onClick={() => handleTabChange('buy')}>
            <FontAwesomeIcon icon={faArrowDown} /> รับซื้อทอง
          </button>
          <button className={`nsf-tab ${tab === 'discount' ? 'nsf-tab-active nsf-tab-discount' : ''}`} onClick={() => handleTabChange('discount')} style={tab === 'discount' ? { borderBottomColor: 'var(--blue)', color: 'var(--blue)' } : {}}>
            <FontAwesomeIcon icon={faTag} /> เพิ่มส่วนลด
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '12px 16px 0' }}>{error}</div>}

        <div className="modal-body">
          {/* ส่ง State ที่รวมกันแล้วลงไปให้ตัวลูกใช้งาน */}
          {tab === 'sell' && <NewSaleFormSell formData={formData} setFormData={setFormData} todayPrice={todayPrice} />}
          {tab === 'buy' && <NewSaleFormBuy formData={formData} setFormData={setFormData} todayPrice={todayPrice} />}
          {tab === 'discount' && <NewSaleFormDiscount formData={formData} setFormData={setFormData} />}
        </div>

        {/* ─── Pinned footer: final price + actions, always visible ───── */}
        <div className="modal-footer">
          <div className="nsf-footer-summary">
            <div className="nsf-footer-summary-row">
              <span className="nsf-footer-total-label">{footerLabel}</span>
              {footerBadge && (
                <span className={`nsf-footer-badge-plain nsf-footer-badge-plain--${tab}`}>
                  {tab === 'sell' ? 'ส่วนลด ' : 'ปรับราคา '}{footerBadge}
                </span>
              )}
            </div>
            <div className="nsf-footer-summary-row">
              <span className="nsf-footer-total-amount" style={{ color: footerColor }}>
                {formatBaht(footerTotal)}
              </span>
            </div>
            {showStockWarning && (
              <div className="nsf-footer-stock-badge">
                คำเตือน: สต็อกคงเหลือ {formData.stock_quantity} ชิ้น — ตรวจสอบก่อนขาย
              </div>
            )}
          </div>
          <div className="nsf-footer-actions">
            <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button
              className="btn btn-primary"
              onClick={handleAddToCart}
              style={tab === 'buy' ? { background: 'var(--amber)', color: '#fff', border: 'none' } : tab === 'discount' ? { background: 'var(--blue)', color: '#fff', border: 'none' } : tab === 'sell' ? { background: 'var(--green)', color: '#fff', border: 'none' } : {}}
            >
              {tab === 'buy' ? 'เพิ่มรายการรับซื้อ' : tab === 'discount' ? 'เพิ่มส่วนลดลงตะกร้า' : 'เพิ่มรายการขาย'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}