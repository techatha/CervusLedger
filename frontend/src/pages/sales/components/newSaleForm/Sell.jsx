import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTag, faCheck, faPen, faXmark } from '@fortawesome/free-solid-svg-icons'
import { formatBaht, fullName, toBE } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import CustomerNoteSection from './CustomerNote.jsx'
import GoldTypeSelectSection from '@/components/GoldTypeSelectSection.jsx'

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
    const cleanValue = parseFloat(parsedNegotiated)
    if (!isNaN(cleanValue)) {
      setNegotiatedPrice(String(cleanValue))
      setFormData(prev => ({ ...prev, discount_amount: discountAmount }))
    }
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
            <span className="nsf-price-hint">
              * ราคาขายทองแท่งปัจจุบัน: {formatBaht(todayPrice.sell_price_per_baht)}{' '}
              <br />{toBE(todayPrice.date)} เวลา {todayPrice.update_time}
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

      {/* ─── Total + Negotiation ─────────────────────────────────── */}
      {sellTotal > 0 && (
        <>
          {/* Total preview */}
          <div className="nsf-total nsf-total-gold" style={{ marginTop: '16px' }}>
            <span className="nsf-total-label">ยอดรวมสุทธิ</span>
            <div className="nsf-total-right">
              {hasDiscount ? (
                <>
                  <div className="nsf-discount-row">
                    <span className="nsf-price-old">{formatBaht(sellTotal)}</span>
                    <span className="nsf-total-amount">{formatBaht(parsedNegotiated)}</span>
                  </div>
                  <div className="nsf-discount-label">
                    <FontAwesomeIcon icon={faTag} style={{ marginRight: '4px' }} />
                    ส่วนลด {formatBaht(discountAmount)}
                  </div>
                </>
              ) : (
                <span className="nsf-total-amount">{formatBaht(sellTotal)}</span>
              )}
              {formData.calculated_gold_price > 0 && (
                <div className="nsf-total-breakdown">
                  ราคาทอง: {formatBaht(formData.calculated_gold_price)}
                  {formData.labor_fee
                    ? ` + ค่ากำเหน็จ: ${formatBaht(parseFloat(String(formData.labor_fee).replace(/,/g, '')))}`
                    : ''}
                </div>
              )}
            </div>
          </div>

          {/* Negotiation toggle */}
          <div className="nsf-negotiate">
            {negotiationMode === 'off' ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm nsf-negotiate-trigger"
                onClick={() => {
                  setNegotiationMode('editing')
                  setNegotiatedPrice(String(sellTotal))
                }}
              >
                <FontAwesomeIcon icon={faPen} style={{ fontSize: '12px' }} />
                ต่อรองราคา / ให้ส่วนลดพิเศษ
              </button>

            ) : negotiationMode === 'editing' ? (
              <div className="nsf-negotiate-bar">
                <FontAwesomeIcon icon={faTag} className="nsf-negotiate-tag" />
                <input
                  className="input input-negotiated"
                  type="text"
                  inputMode="decimal"
                  placeholder="ราคาที่ตกลงกับลูกค้า..."
                  value={formatNumberInput(negotiatedPrice)}
                  onChange={e => {
                    console.log(e.target.value, "test input value")
                    setNegotiatedPrice(e.target.value)}}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleApplyNegotiated(); setNegotiationMode('confirmed') }
                  }}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button
                  type="button"
                  className="nsf-negotiate-confirm"
                  onClick={() => { handleApplyNegotiated(); setNegotiationMode('confirmed') }}
                  title="ยืนยันราคา"
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button
                  type="button"
                  className="nsf-negotiate-cancel"
                  onClick={() => {
                    setNegotiationMode('off')
                    setNegotiatedPrice('')
                    setFormData(prev => ({ ...prev, discount_amount: 0 }))
                  }}
                  title="ยกเลิก"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

            ) : /* confirmed */ (
              <div className="nsf-negotiate-bar nsf-negotiate-bar--confirmed">
                <div className="nsf-negotiate-info">
                  <div className="nsf-negotiate-check">
                    <FontAwesomeIcon icon={faCheck} />
                  </div>
                  <div>
                    <div className="nsf-negotiate-discount">
                      <FontAwesomeIcon icon={faTag} style={{ marginRight: '5px' }} />
                      ส่วนลด {formatBaht(discountAmount)}
                    </div>
                    <div className="nsf-negotiate-agreed">
                      ราคาตกลง: {formatBaht(parsedNegotiated)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm nsf-negotiate-edit"
                  onClick={() => setNegotiationMode('editing')}
                  title="แก้ไขราคา"
                >
                  <FontAwesomeIcon icon={faPen} style={{ fontSize: '12px' }} />
                  แก้ไข
                </button>
              </div>
            )}
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
