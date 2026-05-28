import { useState, useEffect, useRef } from 'react'
import { fullName, formatBaht, toBE } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faRotateLeft, faCheck } from '@fortawesome/free-solid-svg-icons'
import CustomerNoteSection from './CustomerNote.jsx'
import GoldTypeSelectSection from './GoldTypeSelectSection.jsx'
import { GetAllSettings } from 'wailsjs/go/handlers/SettingsHandler'

export default function NewSaleFormBuy({ formData, setFormData, todayPrice }) {
  const setBuyField = (k, v) => setFormData(p => ({ ...p, [k]: v }))
  const [isEditingTotal, setIsEditingTotal] = useState(false)
  const [editedTotal, setEditedTotal] = useState('')
  const [hasManualOverride, setHasManualOverride] = useState(false)
  const [buyingDifference, setBuyingDifference] = useState(0)
  const totalInputRef = useRef(null)
  const calculatedRef = useRef(0)

  useEffect(() => {
    GetAllSettings()
      .then(data => {
        if (data && data.buying_difference) {
          const diff = parseFloat(data.buying_difference) || 0
          setBuyingDifference(diff)
          updateBuyCalculation({}, diff)
        }
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
  }, [formData.gold_item_id])

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

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label form-label-required">ราคาทองแท่ง (บาท)</label>
        <input
          className="input"
          type="text"
          value={formatNumberInput(formData.price_per_baht)}
          onChange={e => updateBuyCalculation({ price_per_baht: e.target.value })}
          onBlur={e => updateBuyCalculation({ price_per_baht: formatCurrency(e.target.value) })}
          placeholder="0.00"
          disabled={!formData.gold_item_id}
        />
        {todayPrice && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
            * ราคารับซื้อทองแท่งปัจจุบัน: {formatBaht(todayPrice.buy_price_per_baht)}
            <br />{toBE(todayPrice.date)} เวลา {todayPrice.update_time}
          </span>
        )}
      </div>

      {/* ─── Price Summary Card ─────────────────────────────────── */}
      {calculatedTotal > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Auto-calculated row */}
          <div className="nsf-total nsf-total-buy">
            <div>
              <div className="nsf-total-label">ราคาคำนวณอัตโนมัติ</div>
              {formData.weight_grams && formData.purity && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {buyingDifference > 0 ? (
                    `(${formatNumberInput(formData.price_per_baht)} - ${formatNumberInput(buyingDifference)})`
                  ) : (
                    formatNumberInput(formData.price_per_baht)
                  )} × {formData.purity}% × {formData.weight_grams} ก.
                </div>
              )}
            </div>
            <span
              className="nsf-total-amount"
              style={{
                fontSize: hasManualOverride ? '16px' : '24px',
                opacity: hasManualOverride ? 0.4 : 1,
                textDecoration: hasManualOverride ? 'line-through' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {formatBaht(calculatedTotal)}
            </span>
          </div>

          {/* Actual buy price row */}
          <div
            className="nsf-total"
            style={{
              background: hasManualOverride ? 'var(--amber-bg)' : 'var(--bg-surface)',
              border: hasManualOverride ? '1.5px solid var(--amber)' : '1px solid var(--border)',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div className="nsf-total-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                ราคารับซื้อจริง
                {hasManualOverride && (
                  <span style={{
                    padding: '1px 7px',
                    borderRadius: '99px',
                    background: 'var(--amber-bg)',
                    color: 'var(--amber)',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid rgba(212,140,60,0.3)',
                  }}>
                    {priceDiff > 0 ? '+' : ''}{formatBaht(priceDiff)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isEditingTotal ? (
                <>
                  <input
                    ref={totalInputRef}
                    className="input"
                    type="text"
                    value={editedTotal}
                    onChange={e => setEditedTotal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCommitTotal() } }}
                    placeholder={String(calculatedTotal)}
                    style={{
                      width: '140px', textAlign: 'right',
                      fontSize: '18px', fontWeight: 700,
                      color: 'var(--amber)',
                      border: '1.5px solid var(--amber)',
                    }}
                  />
                  {/* Solid amber confirm button */}
                  <button
                    type="button"
                    onClick={handleCommitTotal}
                    title="ยืนยันราคา"
                    style={{
                      height: '40px', width: '40px', flexShrink: 0,
                      background: 'var(--amber)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff',
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="nsf-total-amount"
                    style={{ color: hasManualOverride ? 'var(--amber)' : 'var(--amber)' }}
                  >
                    {formatBaht(currentTotal)}
                  </span>
                  {/* Edit button */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleStartEditTotal}
                    title="แก้ไขราคา"
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                  >
                    <FontAwesomeIcon icon={faPen} style={{ fontSize: '12px' }} />
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
              className="btn btn-ghost btn-sm"
              onClick={handleResetToCalculated}
              style={{ alignSelf: 'flex-end', color: 'var(--text-muted)', gap: '5px' }}
            >
              <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize: '11px' }} />
              คืนราคาคำนวณ
            </button>
          )}
        </div>
      )}

      {/* ─── Inventory checkbox ─────────────────────────────────── */}
      <div style={{ marginTop: '16px' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px',
          background: formData.is_inventory === 1 ? 'var(--green-bg)' : 'var(--bg-surface)',
          border: formData.is_inventory === 1 ? '1px solid rgba(91,175,130,0.35)' : '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer', userSelect: 'none',
          transition: 'all 0.2s ease',
        }}>
          <input
            type="checkbox"
            checked={formData.is_inventory === 1}
            onChange={e => setBuyField('is_inventory', e.target.checked ? 1 : 0)}
            style={{ transform: 'scale(1.2)', cursor: 'pointer', accentColor: 'var(--green)' }}
          />
          <div>
            <div style={{ fontSize: '14px', color: formData.is_inventory === 1 ? 'var(--green)' : 'var(--text-secondary)', fontWeight: 500 }}>
              นำเข้าคลังสินค้าหลัก
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
              บันทึกในคลังสำหรับนับสต็อกประจำเดือน
            </div>
          </div>
        </label>
      </div>

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
