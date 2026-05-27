import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTag, faCheck, faPen } from '@fortawesome/free-solid-svg-icons'
import { formatBaht, fullName, toBE } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import CustomerNoteSection from './CustomerNote.jsx'
import GoldTypeSelectSection from './GoldTypeSelectSection.jsx'

export default function NewSaleFormSell({ formData, setFormData, todayPrice }) {
  const [negotiatedPrice, setNegotiatedPrice] = useState('')
  const [negotiationMode, setNegotiationMode] = useState('off')

  const sellTotal = formData.total_amount ? parseFloat(formData.total_amount || 0) : 0

  useEffect(() => {
    setNegotiationMode('off')
    setNegotiatedPrice('')
    setFormData(prev => ({ ...prev, discount_amount: 0 }))
  }, [formData.gold_item_id, setFormData])

  const parsedNegotiated = parseFloat(String(negotiatedPrice).replace(/,/g, '')) || 0
  const hasDiscount = negotiationMode !== 'off' && parsedNegotiated !== sellTotal
  const discountAmount = hasDiscount ? sellTotal - parsedNegotiated : 0

  const handleApplyNegotiated = () => {
    const cleanValue = parseFloat(negotiatedPrice)
    if (!isNaN(cleanValue)) {
      setNegotiatedPrice(String(cleanValue))
      // อัปเดต discount_amount กลับไปให้แม่
      setFormData(prev => ({ ...prev, discount_amount: discountAmount }))
    }
    setNegotiationMode('view')
  }

  const updateSellCalculation = (updatedFields) => {
    setFormData(prev => {
      const next = { ...prev, ...updatedFields }

      const basePrice = parseFloat(String(next.price_per_baht).replace(/,/g, '') || 0)
      const labor = parseFloat(String(next.labor_fee).replace(/,/g, '') || 0)
      const weightG = parseFloat(next.weight_grams || 0)
      const purityVal = parseFloat(next.purity || 0)

      let calculatedGold = 0
      if (basePrice && weightG && purityVal) {
        calculatedGold = Math.round(basePrice * (purityVal / 100) * 656 * weightG / 10000)
      }

      const rawTotal = calculatedGold + labor

      return {
        ...next,
        calculated_gold_price: calculatedGold,
        total_amount: rawTotal > 0 ? String(rawTotal) : ''
      }
    })
  }

  useEffect(() => {
    if (!formData.price_per_baht && todayPrice?.sell_price_per_baht) {
      updateSellCalculation({ price_per_baht: String(todayPrice.sell_price_per_baht) })
    }
  }, [todayPrice])

  return (
    <>
      <GoldTypeSelectSection
        tabMode="sell"
        goldItemId={formData.gold_item_id}
        weightGrams={formData.weight_grams}
        purity={formData.purity}
        onChange={updateSellCalculation}
      />

      <div className="form-row form-row-2">
        <div className="form-group">
          <label className="form-label form-label-required">ราคาทองแท่ง (บาท)</label>
          <input
            className="input"
            type="text"
            value={formatNumberInput(formData.price_per_baht)}
            onChange={e => updateSellCalculation({ price_per_baht: e.target.value })}
            onBlur={e => updateSellCalculation({ price_per_baht: formatCurrency(e.target.value) })}
            placeholder="0.00"
            disabled={!formData.gold_item_id}
          />
          {todayPrice && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal' }}>
              * ราคาขายทองแท่งปัจจุบัน: {formatBaht(todayPrice.sell_price_per_baht)} <br />{toBE(todayPrice.date)} เวลา {todayPrice.update_time}
            </span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">ค่ากำเหน็จ (บาท)</label>
          <input
            className="input"
            type="text"
            value={formatNumberInput(formData.labor_fee)}
            onChange={e => updateSellCalculation({ labor_fee: e.target.value })}
            onBlur={e => updateSellCalculation({ labor_fee: formatCurrency(e.target.value) })}
            placeholder="0.00"
            disabled={!formData.gold_item_id}
          />
        </div>
      </div>

      {sellTotal > 0 && (
        <>
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={negotiationMode !== 'off'}
                onChange={e => {
                  if (e.target.checked) {
                    setNegotiationMode('edit')
                    setNegotiatedPrice(String(sellTotal))
                  } else {
                    setNegotiationMode('off')
                    setNegotiatedPrice('')
                    setFormData(prev => ({ ...prev, discount_amount: 0 }))
                  }
                }}
                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>ปรับราคาตกลงขายใหม่ (ต่อรองราคา / ให้ส่วนลดพิเศษ)</span>
            </label>
          </div>

          {negotiationMode !== 'off' && (
            <div className="form-group" style={{ marginTop: '8px', background: 'var(--red-bg)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--red)', marginBottom: '12px' }}>
              {negotiationMode === 'edit' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    ราคาตกลงขายใหม่ (ส่วนลดจะถูกเพิ่มลงตะกร้าแยกอัตโนมัติ)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      className="input input-negotiated"
                      type="number"
                      min="0"
                      placeholder="กรอกราคาที่ลูกค้าต่อรอง..."
                      value={negotiatedPrice}
                      onChange={e => setNegotiatedPrice(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleApplyNegotiated()
                        }
                      }}
                      style={{ flex: 1, fontSize: '16px', fontWeight: 'bold' }}
                      autoFocus
                    />
                    <button type="button" className="btn btn-primary" onClick={handleApplyNegotiated} title="ยืนยันราคา" style={{ height: '40px', width: '40px', padding: 0, borderRadius: '8px', background: 'var(--red)', border: 'none' }}>
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                  </div>
                  {hasDiscount && (
                    <span style={{ fontSize: '13.5px', color: 'var(--red)', fontWeight: 'bold' }}>
                      <FontAwesomeIcon icon={faTag} /> ลดไป: {formatBaht(discountAmount)} บ.
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  {hasDiscount ? (
                    <span style={{ fontSize: '15px', color: 'var(--red)', fontWeight: 'bold' }}>
                      <FontAwesomeIcon icon={faTag} /> ลดไป: {formatBaht(discountAmount)} บ.
                    </span>
                  ) : (
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>ไม่มีส่วนลดเพิ่มเติม</span>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => setNegotiationMode('edit')} title="แก้ไขราคา" style={{ height: '36px', width: '36px', padding: 0, borderRadius: '8px', color: 'var(--text-secondary)' }}>
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="nsf-total nsf-total-gold">
            <span className="nsf-total-label">ยอดรวมสุทธิ</span>
            <div style={{ textAlign: 'right' }}>
              {hasDiscount ? (
                <>
                  <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '16px', marginRight: '8px' }}>{formatBaht(sellTotal)}</span>
                  <span className="nsf-total-amount" style={{ color: 'var(--gold)' }}>{formatBaht(parsedNegotiated)}</span>
                </>
              ) : (
                <span className="nsf-total-amount">{formatBaht(sellTotal)}</span>
              )}
              {formData.calculated_gold_price > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  (ราคาทอง: {formatBaht(formData.calculated_gold_price)} {formData.labor_fee ? `+ ค่ากำเหน็จ: ${formatBaht(parseFloat(String(formData.labor_fee).replace(/,/g, '')))}` : ''})
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <CustomerNoteSection
        tabMode="sell"
        customerId={formData.customer_id}
        customerLabel={formData.customer_label}
        notes={formData.notes}
        onCustomerSelect={(c) => setFormData(prev => ({ ...prev, customer_id: c.id, customer_label: fullName(c) }))}
        onCustomerClear={() => setFormData(prev => ({ ...prev, customer_id: 0, customer_label: '' }))}
        onNotesChange={(text) => setFormData(prev => ({ ...prev, notes: text }))}
      />
    </>
  )
}