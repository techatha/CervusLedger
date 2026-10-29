import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTag, faCheck, faPen, faXmark, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { ListStockLogs } from 'wailsjs/go/gold_item_handler/GoldItemHandler.js'
import { formatBaht, fullName, toBE } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import CustomerNoteSection from './CustomerNote.jsx'
import GoldTypeSelectSection from '@/components/GoldTypeSelectSection.jsx'
import './Sell.css'

export default function NewSaleFormSell({ formData, setFormData, todayPrice }) {
  const [negotiatedPrice, setNegotiatedPrice] = useState('')
  const [negotiationMode, setNegotiationMode] = useState('off')
  const [isExchange, setIsExchange] = useState(false)
  const [exchangeWeight, setExchangeWeight] = useState('')
  const [exchangePurity, setExchangePurity] = useState('')
  const [exchangeGoldPrice, setExchangeGoldPrice] = useState('')

  const sellTotal = formData.total_amount ? Number.parseFloat(formData.total_amount || 0) : 0

  useEffect(() => {
    setNegotiationMode('off')
    setNegotiatedPrice('')
    setIsExchange(false)
    setExchangeWeight('')
    setExchangePurity('')
    setExchangeGoldPrice('')
    setFormData(prev => ({ ...prev, discount_amount: 0, exchange_data: null }))
  }, [formData.gold_item_id, setFormData])

  // Live calculation of negotiated discount or gold exchange
  useEffect(() => {
    if (negotiationMode !== 'editing') return

    if (isExchange) {
      const w = Number.parseFloat(String(exchangeWeight).replace(/,/g, '')) || 0
      const p = Number.parseFloat(String(exchangePurity).replace(/,/g, '')) || 0
      const gp = Number.parseFloat(String(exchangeGoldPrice).replace(/,/g, '')) || 0
      if (w > 0 && p > 0 && gp > 0) {
        const exchangeVal = Math.round(gp * (p / 100) * 656 * w / 10000)
        setFormData(prev => ({
          ...prev,
          discount_amount: 0,
          exchange_data: {
            is_exchange: true,
            weight_grams: w,
            purity: p,
            price_per_baht: gp,
            total_amount: exchangeVal
          }
        }))
      } else {
        setFormData(prev => ({ ...prev, discount_amount: 0, exchange_data: null }))
      }
    } else {
      const cleanVal = Number.parseFloat(String(negotiatedPrice).replace(/,/g, ''))
      if (!Number.isNaN(cleanVal) && cleanVal > 0) {
        const disc = sellTotal > 0 ? sellTotal - cleanVal : 0
        setFormData(prev => ({
          ...prev,
          discount_amount: disc,
          exchange_data: null
        }))
      } else {
        setFormData(prev => ({ ...prev, discount_amount: 0, exchange_data: null }))
      }
    }
  }, [negotiationMode, isExchange, negotiatedPrice, exchangeWeight, exchangePurity, exchangeGoldPrice, sellTotal, setFormData])

  const parsedNegotiated = Number.parseFloat(String(negotiatedPrice).replace(/,/g, '')) || 0
  const hasDiscount = (formData.discount_amount || 0) > 0
  const discountAmount = formData.discount_amount || 0
  const exchangeVal = formData.exchange_data?.total_amount || 0

  const updateSellCalculation = (updatedFields) => {
    setFormData(prev => {
      const next = { ...prev, ...updatedFields }

      const basePrice = Number.parseFloat(String(next.price_per_baht).replace(/,/g, '') || 0)
      const labor = Number.parseFloat(String(next.labor_fee).replace(/,/g, '') || 0)
      const weightG = Number.parseFloat(next.weight_grams || 0)
      const purityVal = Number.parseFloat(next.purity || 0)

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

  // Keep formData.stock_quantity in sync — display now lives in the pinned footer
  useEffect(() => {
    if (formData.gold_item_id > 0) {
      ListStockLogs('')
        .then(logs => {
          const itemLogs = (logs || []).filter(log => log.gold_item_id === formData.gold_item_id)
          if (itemLogs.length > 0) {
            itemLogs.sort((a, b) => b.id - a.id)
            const latestAmount = itemLogs[0].amount
            setFormData(prev => ({ ...prev, stock_quantity: latestAmount }))
          } else {
            setFormData(prev => ({ ...prev, stock_quantity: 0 }))
          }
        })
        .catch(err => {
          console.error('Failed to load stock quantity:', err)
          setFormData(prev => ({ ...prev, stock_quantity: 0 }))
        })
    } else {
      setFormData(prev => {
        if (prev.stock_quantity !== undefined && prev.stock_quantity !== null) {
          return { ...prev, stock_quantity: null }
        }
        return prev
      })
    }
  }, [formData.gold_item_id, setFormData])

  const liveCleanVal = Number.parseFloat(String(negotiatedPrice).replace(/,/g, '')) || 0
  const liveDiscount = (liveCleanVal > 0 && liveCleanVal < sellTotal) ? sellTotal - liveCleanVal : 0

  const liveW = Number.parseFloat(String(exchangeWeight).replace(/,/g, '')) || 0
  const liveP = Number.parseFloat(String(exchangePurity).replace(/,/g, '')) || 0
  const liveGP = Number.parseFloat(String(exchangeGoldPrice).replace(/,/g, '')) || 0
  const liveExchangeVal = (liveW > 0 && liveP > 0 && liveGP > 0) ? Math.round(liveGP * (liveP / 100) * 656 * liveW / 10000) : 0

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
          <label className="form-label form-label-required" htmlFor="nsf-sell-gold-price">ราคาทองแท่ง (บาท)</label>
          <input
            id="nsf-sell-gold-price" className="input"
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
          <label className="form-label" htmlFor="nsf-sell-labor-fee">ค่ากำเหน็จ (บาท)</label>
          <input
            id="nsf-sell-labor-fee" className="input"
            type="text"
            value={formatNumberInput(formData.labor_fee)}
            onChange={e => updateSellCalculation({ labor_fee: e.target.value })}
            onBlur={e => updateSellCalculation({ labor_fee: formatCurrency(e.target.value) })}
            placeholder="0.00"
            disabled={!formData.gold_item_id}
          />
        </div>
      </div>

      {/* ─── Breakdown (only when total exists) ── */}
      {sellTotal > 0 && formData.calculated_gold_price > 0 && (
        <div className="nsf-total-breakdown" style={{ marginTop: '14px' }}>
          ราคาทอง: {formatBaht(formData.calculated_gold_price)}
          {formData.weight_grams && formData.purity && (
            <span style={{ marginLeft: '6px', opacity: 0.8 }}>
              ({formatNumberInput(formData.price_per_baht)} × {formData.purity}% × {formData.weight_grams} ก.)
            </span>
          )}
          {formData.labor_fee
            ? ` + ค่ากำเหน็จ: ${formatBaht(Number.parseFloat(String(formData.labor_fee).replace(/,/g, '')))}`
            : ''}
        </div>
      )}

      {/* ─── Negotiation (always visible) ── */}
      <div className="nsf-negotiate">
        {negotiationMode === 'off' ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm nsf-negotiate-trigger"
            onClick={() => {
              setNegotiationMode('editing')
              setNegotiatedPrice(sellTotal > 0 ? String(sellTotal) : '')
              if (todayPrice?.buy_price_per_baht) {
                setExchangeGoldPrice(String(todayPrice.buy_price_per_baht))
              }
            }}
          >
            <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: '12px' }} />
            แก้ไขราคา
          </button>

        ) : (
          <div className="nsf-negotiate-bar nsf-negotiate-bar--panel">
            <div className="nsf-negotiate-panel-header">
              <FontAwesomeIcon icon={faPenToSquare} className="nsf-negotiate-tag" />
              <span>แก้ไขราคา</span>
            </div>

            <label className="nsf-toggle-switch">
              <input
                type="checkbox"
                checked={isExchange}
                onChange={e => {
                  setIsExchange(e.target.checked)
                  if (e.target.checked && todayPrice?.buy_price_per_baht) {
                    setExchangeGoldPrice(String(todayPrice.buy_price_per_baht))
                  }
                }}
              />
              <span className="nsf-toggle-slider" />
              <span className="nsf-toggle-text">เปลี่ยนทองเก่า</span>
            </label>

            {isExchange ? (
              <div className="nsf-negotiate-exchange-fields">
                <div className="nsf-negotiate-exchange-row">
                  <div className="nsf-negotiate-exchange-group">
                    <label className="nsf-negotiate-field-label" htmlFor="nsf-negotiate-exchange-weight">น้ำหนัก (กรัม)</label>
                    <input
                      id="nsf-negotiate-exchange-weight" className="input"
                      type="number"
                      min="0"
                      step="0.0001"
                      placeholder="0.00"
                      value={exchangeWeight}
                      onChange={e => setExchangeWeight(e.target.value)}
                      
                    />
                  </div>
                  <div className="nsf-negotiate-exchange-group">
                    <label className="nsf-negotiate-field-label" htmlFor="nsf-negotiate-exchange-purity">ความบริสุทธิ์ (%)</label>
                    <input
                      id="nsf-negotiate-exchange-purity" className="input"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="96.5"
                      value={exchangePurity}
                      onChange={e => setExchangePurity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="nsf-negotiate-exchange-group">
                  <label className="nsf-negotiate-field-label" htmlFor="nsf-negotiate-exchange-gold-price">ราคาทองแท่ง (บาท)</label>
                  <input
                    id="nsf-negotiate-exchange-gold-price" className="input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formatNumberInput(exchangeGoldPrice)}
                    onChange={e => setExchangeGoldPrice(e.target.value)}
                  />
                  {todayPrice && (
                    <span className="nsf-price-hint">
                      * ราคารับซื้อทองแท่งปัจจุบัน: {formatBaht(todayPrice.buy_price_per_baht)}
                      <br />{toBE(todayPrice.date)} เวลา {todayPrice.update_time}
                    </span>
                  )}
                </div>

                {/* Live calculation card for exchange */}
                {liveExchangeVal > 0 && (
                  <div className="nsf-negotiate-bar nsf-negotiate-bar--confirmed" style={{ marginTop: '8px' }}>
                    <div className="nsf-negotiate-info">
                      <div className="nsf-negotiate-check" style={{ background: 'var(--green)' }}>
                        <FontAwesomeIcon icon={faCheck} />
                      </div>
                      <div>
                        <div className="nsf-negotiate-discount" style={{ color: 'var(--green)' }}>
                          หักแลกเปลี่ยนทองเก่า {formatBaht(liveExchangeVal)}
                        </div>
                        <div className="nsf-negotiate-agreed">
                          ทองแลก: {exchangeWeight} ก. ({exchangePurity}%) — บันทึกเป็นรายการรับซื้อทอง (ต้องระบุลูกค้า)
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="nsf-negotiate-exchange-fields">
                <div className="nsf-negotiate-exchange-group">
                  <label className="nsf-negotiate-field-label" htmlFor="nsf-negotiate-discount-price">ระบุราคาที่ตกลงใหม่</label>
                  <input
                    id="nsf-negotiate-discount-price" className="input"
                    type="text"
                    inputMode="decimal"
                    placeholder="ราคาที่ตกลงกับลูกค้า..."
                    value={formatNumberInput(negotiatedPrice)}
                    onChange={e => setNegotiatedPrice(e.target.value)}
                    
                  />
                  {/* Live calculation card for discount */}
                  {liveCleanVal > 0 && (
                    <div className="nsf-negotiate-bar nsf-negotiate-bar--confirmed" style={{ marginTop: '8px' }}>
                      <div className="nsf-negotiate-info">
                        <div className="nsf-negotiate-check">
                          <FontAwesomeIcon icon={faCheck} />
                        </div>
                        <div>
                          <div className="nsf-negotiate-discount">
                            <FontAwesomeIcon icon={faTag} style={{ marginRight: '5px' }} />
                            {sellTotal > 0 && liveDiscount !== 0
                              ? (liveDiscount > 0 ? `ส่วนลด ${formatBaht(liveDiscount)}` : `ปรับราคา +${formatBaht(Math.abs(liveDiscount))}`)
                              : 'ราคาตกลง'}
                          </div>
                          <div className="nsf-negotiate-agreed">
                            ราคาตกลงสุทธิ: {formatBaht(liveCleanVal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="nsf-negotiate-panel-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setNegotiationMode('off')
                  setNegotiatedPrice('')
                  setIsExchange(false)
                  setExchangeWeight('')
                  setExchangePurity('')
                  setExchangeGoldPrice('')
                  setFormData(prev => ({ ...prev, discount_amount: 0, exchange_data: null }))
                }}
              >
                ยกเลิกการปรับราคา
              </button>
            </div>
          </div>
        )}
      </div>

      <CustomerNoteSection
        tabMode="sell"
        isCustomerRequired={isExchange || Boolean(formData.exchange_data?.is_exchange)}
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