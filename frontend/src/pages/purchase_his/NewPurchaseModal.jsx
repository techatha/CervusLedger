import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GetTodayPrice } from 'wailsjs/go/gold_price_handler/GoldPriceHandler.js'
import NewSaleFormBuy from '../sales/components/newSaleForm/Buy.jsx'
import '../sales/NewSaleForm.css'

import { getLocalISOString } from '@/utils/date'
import { formatBaht } from '@/utils/thai.js'

const today = () => getLocalISOString().slice(0, 10)

const BLANK_BUY = {
  gold_item_id: 0,
  gold_item_label: '',
  weight_grams: '',
  purity: '96.5',
  price_per_baht: '',
  item_type: '',
  item_subtype: '',
  weight_baht: '',
  total_amount: '',
  is_inventory: 0,
  customer_id: 0,
  customer_label: '',
  notes: '',
  date: today(),
}

export default function NewPurchaseModal({ onClose }) {
  const navigate = useNavigate()
  const [todayPrice, setTodayPrice] = useState(null)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({ ...BLANK_BUY })

  useEffect(() => {
    console.log("hdjkj")
    GetTodayPrice()
      .then(price => {
        console.log(price)
        setTodayPrice(price)
      })
      .catch(e => console.error('Failed to load today price in NewPurchaseModal:', e))
  }, [])

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError(null)

    if (!formData.customer_id) return setError('กรุณาเลือกลูกค้าสำหรับการรับซื้อทอง')
    if (!formData.item_type?.trim()) return setError('กรุณากรอกประเภททอง')
    if (!formData.weight_baht) return setError('กรุณากรอกน้ำหนัก')
    if (!formData.total_amount) return setError('กรุณากรอกราคารับซื้อรวม')

    const priceID = todayPrice?.id || 0
    const itemToAdd = {
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
    }

    onClose()
    navigate('/sales', { state: { addItems: [itemToAdd] } })
  }

  const parseNum = (v) => parseFloat(String(v ?? '').replace(/,/g, '')) || 0
  const footerTotal = parseNum(formData.total_amount)
  const footerLabel = 'ยอดรับซื้อ'
  const footerColor = 'var(--amber)'

  const footerBadge = (() => {
    if (formData.is_override) {
      const diff = parseNum(formData.override_diff)
      if (diff === 0) return null
      return `${diff > 0 ? '+' : '-'}${formatBaht(Math.abs(diff))}`
    }
    return null
  })()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal nsf-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">ทำรายการรับซื้อทองใหม่</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '12px 16px 0' }}>{error}</div>}

        <div className="modal-body">
          {todayPrice ? (
            <NewSaleFormBuy
              formData={formData}
              setFormData={setFormData}
              todayPrice={todayPrice}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              กำลังโหลดราคาทองคำปัจจุบัน...
            </div>
          )}
        </div>
        <div className="modal-footer">
          <div className="nsf-footer-summary">
            <div className="nsf-footer-summary-row">
              <span className="nsf-footer-total-label">{footerLabel}</span>
              {footerBadge && (
                <span className="nsf-footer-badge-plain nsf-footer-badge-plain--buy">
                  ปรับราคา {footerBadge}
                </span>
              )}
            </div>
            <div className="nsf-footer-summary-row">
              <span className="nsf-footer-total-amount" style={{ color: footerColor }}>
                {formatBaht(footerTotal)}
              </span>
            </div>
          </div>
          <div className="nsf-footer-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              style={{ background: 'var(--amber)', color: '#fff', border: 'none' }}
              disabled={!todayPrice}
            >
              ใส่ตะกร้าและไปหน้ารายการขาย
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
