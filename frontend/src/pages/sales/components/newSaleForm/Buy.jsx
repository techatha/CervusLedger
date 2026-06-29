import { useState, useEffect, useRef } from 'react'
import { fullName, formatBaht, toBE } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faRotateLeft, faCheck } from '@fortawesome/free-solid-svg-icons'
import CustomerNoteSection from './CustomerNote.jsx'
import GoldTypeSelectSection from '@/components/GoldTypeSelectSection.jsx'
import { GetBuyingDifference } from 'wailsjs/go/settings_handler/SettingsHandler'

export default function NewSaleFormBuy({ formData, setFormData, todayPrice }) {
  const setBuyField = (k, v) => setFormData(p => ({ ...p, [k]: v }))
  const [isEditingTotal, setIsEditingTotal] = useState(false)
  const [editedTotal, setEditedTotal] = useState('')
  const [hasManualOverride, setHasManualOverride] = useState(false)
  const [buyingDifference, setBuyingDifference] = useState(0)
  const totalInputRef = useRef(null)
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

      if (!hasManualOverride) {
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
    setHasManualOverride(false)
    setIsEditingTotal(false)
    setEditedTotal('')
  }, [formData.item_type])

  useEffect(() => {
    if (!formData.price_per_baht && todayPrice?.buy_price_per_baht) {
      updateBuyCalculation({ price_per_baht: String(todayPrice.buy_price_per_baht) })
    }
  }, [todayPrice])

  const calculatedTotal = calculatedRef.current
  const currentTotal = parseFloat(String(formData.total_amount).replace(/,/g, '') || 0)
  const priceDiff = hasManualOverride ? currentTotal - calculatedTotal : 0

  const handleStartEditTotal = () => {
    setIsEditingTotal(true)
    setEditedTotal(formData.total_amount || '')
    setTimeout(() => totalInputRef.current?.focus(), 0)
  }

  const handleCommitTotal = () => {
    const cleaned = parseFloat(String(editedTotal).replace(/,/g, '') || 0)
    if (cleaned > 0 && cleaned !== calculatedTotal) {
      setHasManualOverride(true)
      setFormData(prev => ({ ...prev, total_amount: String(cleaned) }))
    } else if (cleaned === calculatedTotal || cleaned <= 0) {
      setHasManualOverride(false)
      setFormData(prev => ({ ...prev, total_amount: calculatedTotal > 0 ? String(calculatedTotal) : '' }))
    }
    setIsEditingTotal(false)
  }

  const handleResetToCalculated = () => {
    setHasManualOverride(false)
    setIsEditingTotal(false)
    setEditedTotal('')
    setFormData(prev => ({ ...prev, total_amount: calculatedTotal > 0 ? String(calculatedTotal) : '' }))
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
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="96.5"
                value={formData.purity || ''}
                onChange={e => updateBuyCalculation({ purity: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

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

      {/* ─── Price Summary Card ─────────────────────────────────── */}
      {calculatedTotal > 0 && (
        <div className="nsf-price-summary">

          {/* Auto-calculated row */}
          <div className="nsf-total nsf-total-buy">
            <div>
              <div className="nsf-total-label">ราคาคำนวณอัตโนมัติ</div>
              {formData.weight_grams && formData.purity && (
                <div className="nsf-total-breakdown">
                  {buyingDifference > 0 ? (
                    `(${formatNumberInput(formData.price_per_baht)} - ${formatNumberInput(buyingDifference)})`
                  ) : (
                    formatNumberInput(formData.price_per_baht)
                  )} × {formData.purity}% × {formData.weight_grams} ก.
                </div>
              )}
            </div>
            <span className={`nsf-total-amount ${hasManualOverride ? 'nsf-total-amount--overridden' : ''}`}>
              {formatBaht(calculatedTotal)}
            </span>
          </div>

          {/* Actual buy price row */}
          <div className={`nsf-total nsf-total-buy ${hasManualOverride ? 'nsf-total-editable--active' : 'nsf-total-editable'}`}>
            <div>
              <div className="nsf-total-label nsf-total-label--icon">
                ราคารับซื้อจริง
                {hasManualOverride && (
                  <span className="nsf-buy-diff-badge">
                    {priceDiff > 0 ? '+' : ''}{formatBaht(priceDiff)}
                  </span>
                )}
              </div>
            </div>

            <div className="nsf-total-actions">
              {isEditingTotal ? (
                <>
                  <input
                    ref={totalInputRef}
                    className="input nsf-buy-edit-input"
                    type="text"
                    value={editedTotal}
                    onChange={e => setEditedTotal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCommitTotal() } }}
                    placeholder={String(calculatedTotal)}
                  />
                  {/* Solid amber confirm button */}
                  <button
                    type="button"
                    className="nsf-buy-confirm"
                    onClick={handleCommitTotal}
                    title="ยืนยันราคา"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                </>
              ) : (
                <>
                  <span className="nsf-total-amount">
                    {formatBaht(currentTotal)}
                  </span>
                  {/* Edit button */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm nsf-buy-edit"
                    onClick={handleStartEditTotal}
                    title="แก้ไขราคา"
                  >
                    <FontAwesomeIcon icon={faPen} />
                    แก้ไข
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Reset to calculated — only shows when overridden */}
          {hasManualOverride && !isEditingTotal && (
            <button
              type="button"
              className="btn btn-ghost btn-sm nsf-buy-reset"
              onClick={handleResetToCalculated}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              คืนราคาคำนวณ
            </button>
          )}
        </div>
      )}

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
