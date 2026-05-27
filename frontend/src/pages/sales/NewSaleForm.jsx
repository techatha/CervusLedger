import { useState } from 'react'
import NewSaleFormSell from './components/newSaleForm/Sell.jsx'
import NewSaleFormBuy from './components/newSaleForm/Buy.jsx'
import NewSaleFormDiscount from './components/newSaleForm/Discount.jsx'
import './NewSaleForm.css'

const today = () => new Date().toISOString().slice(0, 10)

const BLANK_SELL = {
  gold_item_id: 0, gold_item_label: '', weight_grams: '', purity: '90',
  price_per_baht: '', labor_fee: '', total_amount: '', calculated_gold_price: 0,
  customer_id: 0, customer_label: '', notes: '', date: today(),
  discount_amount: 0 // เพิ่มฟิลด์รับค่าส่วนลดจากการต่อรอง
}

const BLANK_BUY = {
  item_type: '', item_subtype: '', weight_baht: '', total_amount: '',
  is_inventory: 0, customer_id: 0, customer_label: '', notes: '', date: today()
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
    return initialTab === 'buy' ? BLANK_BUY : BLANK_DISCOUNT
  })

  const handleTabChange = (newTab) => {
    setTab(newTab)
    setError(null)
    if (newTab === 'sell') setFormData({ ...BLANK_SELL, price_per_baht: todayPrice ? String(todayPrice.sell_price_per_baht) : '' })
    else if (newTab === 'buy') setFormData({ ...BLANK_BUY })
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
      if (!formData.item_subtype?.trim()) return setError('กรุณากรอกรุ่น/น้ำหนัก (Subtype)')
      if (!formData.weight_baht) return setError('กรุณากรอกน้ำหนัก')
      if (!formData.total_amount) return setError('กรุณากรอกราคารับซื้อรวม')

      const priceID = todayPrice?.id || 0
      onAdd({
        type: 'buy',
        customer_id: formData.customer_id,
        gold_item_id: 0,
        weight_baht: parseFloat(formData.weight_baht),
        gold_price_id: priceID,
        price_per_baht: 0,
        total_amount: parseFloat(formData.total_amount),
        notes: formData.notes,
        date: formData.date,
        item_type: formData.item_type,
        item_subtype: formData.item_subtype,
        is_inventory: formData.is_inventory,
        label: `รับซื้อ: ${formData.item_type} — ${formData.item_subtype || (formData.weight_baht + ' บาท')}`,
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal nsf-modal" onClick={e => e.stopPropagation()}>
        <div className="nsf-tab-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button className={`nsf-tab ${tab === 'sell' ? 'nsf-tab-active nsf-tab-sell' : ''}`} onClick={() => handleTabChange('sell')}>
            <IconUp /> ขายทอง
          </button>
          <button className={`nsf-tab ${tab === 'buy' ? 'nsf-tab-active nsf-tab-buy' : ''}`} onClick={() => handleTabChange('buy')}>
            <IconDown /> รับซื้อทอง
          </button>
          <button className={`nsf-tab ${tab === 'discount' ? 'nsf-tab-active nsf-tab-discount' : ''}`} onClick={() => handleTabChange('discount')} style={tab === 'discount' ? { borderBottomColor: 'var(--blue)', color: 'var(--blue)' } : {}}>
            <IconTagMain /> เพิ่มส่วนลด
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* ส่ง State ที่รวมกันแล้วลงไปให้ตัวลูกใช้งาน */}
          {tab === 'sell' && <NewSaleFormSell formData={formData} setFormData={setFormData} todayPrice={todayPrice} />}
          {tab === 'buy' && <NewSaleFormBuy formData={formData} setFormData={setFormData} />}
          {tab === 'discount' && <NewSaleFormDiscount formData={formData} setFormData={setFormData} />}
        </div>

        {/* FOOTER ถูกดึงมาไว้ตรงนี้ที่เดียว */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button 
            className="btn btn-primary" 
            onClick={handleAddToCart} 
            style={tab === 'buy' ? { background: 'var(--amber)', color: '#fff', border: 'none' } : tab === 'discount' ? { background: 'var(--blue)', color: '#fff', border: 'none' } : {}}
          >
            {tab === 'buy' ? 'เพิ่มรายการรับซื้อ' : tab === 'discount' ? 'เพิ่มส่วนลดลงตะกร้า' : 'เพิ่มรายการขาย'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IconUp() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> }
function IconDown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg> }
function IconTagMain() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> }