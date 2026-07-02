import { useState, useEffect, useRef } from 'react'
import { fullName, formatBaht, toBE } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import CustomerNoteSection from './CustomerNote.jsx'
import GoldTypeSelectSection from '@/components/GoldTypeSelectSection.jsx'
import { GetBuyingDifference } from 'wailsjs/go/settings_handler/SettingsHandler'

export default function NewSaleFormBuy({ formData, setFormData, todayPrice }) {
  const [negotiationMode, setNegotiationMode] = useState('off') // 'off' | 'editing' | 'confirmed'
  const [negotiatedPrice, setNegotiatedPrice] = useState('')
  const [buyingDifference, setBuyingDifference] = useState(0)
  const calculatedRef = useRef(0)

  useEffect(() => {
    GetBuyingDifference()
      .then(data => {
        setBuyingDifference(data)
        updateBuyCalculation({}, data)
      })
      .catch(e => console.error('Failed to load settings in Buy.jsx:', e))
  }, [])

  const updateBuyCalculation = (updatedFields, currentBuyingDiff = buyingDifference) => {
    setFormData(prev => {
      const next = { ...prev, ...updatedFields }



      const basePrice = parseFloat(String(next.price_per_baht).replace(/,/g, '') || 0)
      const weightG = parseFloat(next.weight_grams || 0)
      const purityVal = parseFloat(next.purity || 0)

      let calculatedGold = 0
      if (basePrice && weightG && purityVal) {
        const effectivePrice = Math.max(0, basePrice - currentBuyingDiff)
        calculatedGold = Math.round(effectivePrice * (purityVal / 100) * 656 * weightG / 10000)
      }

      calculatedRef.current = calculatedGold

      const finalWeightBaht = weightG ? (weightG * 656 / 10000) : 0

      if (!prev.is_override) {
        return {
          ...next,
          weight_baht: finalWeightBaht > 0 ? String(finalWeightBaht) : '',
          total_amount: calculatedGold > 0 ? String(calculatedGold) : ''
        }
      }

      return {
        ...next,
        weight_baht: finalWeightBaht > 0 ? String(finalWeightBaht) : '',
      }
    })
  }

  useEffect(() => {
    setNegotiationMode('off')
    setNegotiatedPrice('')
    setFormData(prev => (prev.is_override || prev.override_diff
      ? { ...prev, is_override: false, override_diff: 0 }
      : prev))
  }, [formData.item_type, formData.gold_item_id, setFormData])

  useEffect(() => {
    if (!formData.price_per_baht && todayPrice?.buy_price_per_baht) {
      updateBuyCalculation({ price_per_baht: String(todayPrice.buy_price_per_baht) })
    }
  }, [todayPrice])

  const calculatedTotal = calculatedRef.current
  const currentTotal = parseFloat(String(formData.total_amount).replace(/,/g, '') || 0)
  const priceDiff = formData.is_override ? currentTotal - calculatedTotal : 0

  const handleApplyNegotiated = () => {
    const cleaned = parseFloat(String(negotiatedPrice).replace(/,/g, '') || 0)
    if (cleaned > 0 && cleaned !== calculatedTotal) {
      setFormData(prev => ({
        ...prev,
        total_amount: String(cleaned),
        is_override: true,
        override_diff: cleaned - calculatedTotal
      }))
    } else {
      setNegotiationMode('off')
      setNegotiatedPrice('')
      setFormData(prev => ({
        ...prev,
        total_amount: calculatedTotal > 0 ? String(calculatedTotal) : '',
        is_override: false,
        override_diff: 0
      }))
    }
  }

  return (
    <>
      {/* ─── Inventory checkbox ─────────────────────────────────── */}
      <div className="nsf-inventory">
        <label className={`nsf-inventory-label ${formData.is_inventory === 1 ? 'nsf-inventory-label--active' : ''}`}>
          <input
            type="checkbox"
            checked={formData.is_inventory === 1}
            onChange={e => {
              const ticked = e.target.checked ? 1 : 0
              setFormData(prev => ({
                ...prev,
                is_inventory: ticked,
                gold_item_id: 0,
                gold_item_label: '',
                item_type: '',
                item_subtype: '',
                weight_grams: '',
                weight_baht: '',
                total_amount: '',
                purity: ticked ? '0' : '96.5'
              }))
            }}
            className="nsf-inventory-checkbox"
          />
          <div>
            <div className={`nsf-inventory-title ${formData.is_inventory === 1 ? 'nsf-inventory-title--active' : ''}`}>
              นำเข้าคลังสินค้าหลัก
            </div>
            <div className="nsf-inventory-desc">
              บันทึกในคลังสำหรับนับสต็อกประจำเดือน
            </div>
          </div>
        </label>
      </div>
      {formData.is_inventory === 1 ? (
        <GoldTypeSelectSection
          tabMode="buy"
          goldItemId={formData.gold_item_id}
          weightGrams={formData.weight_grams}
          purity={formData.purity}
          onChange={(fields) => {
            const updated = { ...fields }
            if (fields.gold_item_label) {
              const parts = fields.gold_item_label.split(' — ')
              if (parts.length === 2) {
                updated.item_type = parts[0]
                updated.item_subtype = parts[1]
              }
            } else if (fields.gold_item_id === 0) {
              updated.item_type = ''
              updated.item_subtype = ''
            }



            updateBuyCalculation(updated)
          }}
        />
      ) : (
        <>
          <div className="section-divider">ข้อมูลทองคำที่รับซื้อ</div>

          <div className="form-group">
            <label className="form-label form-label-required">ประเภททอง</label>
            <input
              className="input"
              type="text"
              placeholder="ระบุประเภททอง เช่น ทองรูปพรรณ, ทองแท่ง, เศษทอง..."
              value={formData.item_type || ''}
              onChange={e => updateBuyCalculation({ item_type: e.target.value })}
            />
          </div>

          <div className="form-row form-row-2" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label form-label-required">น้ำหนัก (กรัม)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.0001"
                placeholder="0.00"
                value={formData.weight_grams || ''}
                onChange={e => updateBuyCalculation({ weight_grams: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label-required">ความบริสุทธิ์ (%)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="96.5"
                  value={formData.purity || ''}
                  onChange={e => updateBuyCalculation({ purity: e.target.value })}
                  disabled={formData.no_purity === 1}
                  style={{ flex: 1 }}
                />
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={formData.no_purity === 1}
                    onChange={e => updateBuyCalculation({ no_purity: e.target.checked ? 1 : 0, purity: e.target.checked ? '' : '96.5' })}
                    style={{ accentColor: 'var(--amber)' }}
                  />
                  ไม่ระบุ
                </label>
              </div>
            </div>
          </div>
        </>
      )}


      <>
        <div className="form-group nsf-buy-price-group">
          <label className="form-label form-label-required">ราคาทองแท่ง (บาท)</label>
          <input
            className="input"
            type="text"
            value={formatNumberInput(formData.price_per_baht)}
            onChange={e => updateBuyCalculation({ price_per_baht: e.target.value })}
            onBlur={e => updateBuyCalculation({ price_per_baht: formatCurrency(e.target.value) })}
            placeholder="0.00"
            disabled={!formData.item_type}
          />
          {todayPrice && (
            <span className="nsf-buy-today-price-hint">
              * ราคารับซื้อทองแท่งปัจจุบัน: {formatBaht(todayPrice.buy_price_per_baht)}
              <br />{toBE(todayPrice.date)} เวลา {todayPrice.update_time}
            </span>
          )}
        </div>

        {/* ─── Breakdown + Negotiation ── */}
        {calculatedTotal > 0 && (
          <>
            <div className="nsf-total-breakdown" style={{ marginTop: '14px' }}>
              ราคาคำนวณ: {formatBaht(calculatedTotal)}
              {formData.weight_grams && formData.purity && (
                <span style={{ marginLeft: '6px', opacity: 0.8 }}>
                  ({buyingDifference > 0 ? (
                    `${formatNumberInput(formData.price_per_baht)} - ${formatNumberInput(buyingDifference)}`
                  ) : (
                    formatNumberInput(formData.price_per_baht)
                  )} × {formData.purity}% × {formData.weight_grams} ก.)
                </span>
              )}
            </div>

            <div className="nsf-negotiate">
              {negotiationMode === 'off' ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm nsf-negotiate-trigger"
                  onClick={() => {
                    setNegotiationMode('editing')
                    setNegotiatedPrice(String(calculatedTotal))
                  }}
                >
                  <FontAwesomeIcon icon={faPen} style={{ fontSize: '12px' }} />
                  ปรับปรุงราคารับซื้อ / กำหนดราคาเอง
                </button>

              ) : negotiationMode === 'editing' ? (
                <div className="nsf-negotiate-bar">
                  <FontAwesomeIcon icon={faPen} className="nsf-negotiate-tag" style={{ color: 'var(--amber)' }} />
                  <input
                    className="input input-negotiated input-buy-override"
                    type="text"
                    inputMode="decimal"
                    placeholder="ราคารับซื้อที่ต้องการ..."
                    value={formatNumberInput(negotiatedPrice)}
                    onChange={e => setNegotiatedPrice(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleApplyNegotiated()
                        setNegotiationMode(parseFloat(String(negotiatedPrice).replace(/,/g, '')) !== calculatedTotal ? 'confirmed' : 'off')
                      }
                    }}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="nsf-negotiate-confirm"
                    style={{ background: 'var(--amber)' }}
                    onClick={() => {
                      handleApplyNegotiated()
                      setNegotiationMode(parseFloat(String(negotiatedPrice).replace(/,/g, '')) !== calculatedTotal ? 'confirmed' : 'off')
                    }}
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
                      setFormData(prev => ({
                        ...prev,
                        total_amount: calculatedTotal > 0 ? String(calculatedTotal) : '',
                        is_override: false,
                        override_diff: 0
                      }))
                    }}
                    title="ยกเลิก"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>

              ) : (
                <div className="nsf-negotiate-bar nsf-negotiate-bar--confirmed" style={{ borderColor: 'rgba(212, 140, 60, 0.25)', background: 'var(--amber-bg)' }}>
                  <div className="nsf-negotiate-info">
                    <div className="nsf-negotiate-check" style={{ background: 'var(--amber)' }}>
                      <FontAwesomeIcon icon={faCheck} />
                    </div>
                    <div>
                      <div className="nsf-negotiate-discount" style={{ color: 'var(--amber)' }}>
                        ปรับราคา {priceDiff > 0 ? '+' : ''}{formatBaht(priceDiff)}
                      </div>
                      <div className="nsf-negotiate-agreed">
                        ราคารับซื้อจริง: {formatBaht(currentTotal)}
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
      </>

      <CustomerNoteSection
        tabMode="buy"
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
