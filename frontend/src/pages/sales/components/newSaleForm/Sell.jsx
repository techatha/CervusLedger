import { useState, useEffect } from 'react'
import { CreateSale } from 'wailsjs/go/handlers/SaleHandler.js'
import { ListGoldItems } from 'wailsjs/go/handlers/GoldItemHandler.js'
import { formatBaht, fullName } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency, parseSubtypeToGrams } from '@/utils/number.js'
import CustomerNoteSection from './CustomerNote.jsx'

const MAIN_TYPES = ["สร้อยคอ", "สร้อยข้อมือ", "กำไล", "แหวน", "จี้", "ต่างหู", "อื่นๆ"]
const PURITY_OPTIONS = ["90", "70", "58", "40", "อื่นๆ"]
const today = () => new Date().toISOString().slice(0, 10)

const BLANK_SELL = {
  gold_item_id: 0,
  gold_item_label: '',
  gold_item_weight: 0,
  customer_id: 0,
  customer_label: '',
  price_per_baht: '',
  total_amount: '', // final sell price (fully editable)
  notes: '',
  date: today(),

  // Grams & Purity calculation inputs
  weight_grams: '',
  purity: '90', // default 90%
  purity_custom: '',
}

export default function NewSaleFormSell({ todayPrice, onAdd, onSaved, onClose }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [sell, setSell] = useState({
    ...BLANK_SELL,
    price_per_baht: todayPrice ? String(todayPrice.sell_price_per_baht) : '',
  })

  const [goldItems, setGoldItems] = useState([])
  const [selectedMainType, setSelectedMainType] = useState('')

  // Load available gold items on mount
  useEffect(() => {
    ListGoldItems('available').then(d => setGoldItems(d || []))
  }, [])

  const sellTotal = sell.total_amount ? parseFloat(sell.total_amount || 0) : 0

  const updateSellCalculation = (updatedFields) => {
    setSell(prev => {
      const next = { ...prev, ...updatedFields }

      // Strip commas for calculation
      const basePrice = parseFloat(String(next.price_per_baht).replace(/,/g, '') || 0)
      const labor = parseFloat(String(next.labor_fee).replace(/,/g, '') || 0)
      const weightG = parseFloat(next.weight_grams || 0)
      const purityVal = next.purity === 'อื่นๆ' ? parseFloat(next.purity_custom || 0) : parseFloat(next.purity || 0)

      // Calculate pure gold price
      let calculatedGold = 0
      if (basePrice && weightG && purityVal) {
        calculatedGold = Math.round(basePrice * (purityVal / 100) * 656 * weightG / 10000)
      }

      const rawTotal = calculatedGold + labor

      // Handle Negotiated Price / Discount logic
      let discountAmount = next.discount || 0
      let finalTotal = rawTotal

      if (updatedFields.negotiated_price !== undefined) {
        const negoPrice = parseFloat(String(updatedFields.negotiated_price).replace(/,/g, '') || 0)
        if (negoPrice > 0 && negoPrice < rawTotal) {
          discountAmount = rawTotal - negoPrice
          finalTotal = negoPrice
        } else {
          discountAmount = 0
          finalTotal = negoPrice > 0 ? negoPrice : rawTotal
        }
      } else {
        finalTotal = rawTotal - discountAmount
      }

      return {
        ...next,
        calculated_gold_price: calculatedGold,
        discount: discountAmount,
        total_amount: finalTotal > 0 ? String(finalTotal) : ''
      }
    })
  }

  const selectSubtypeById = (id) => {
    const item = goldItems.find(g => g.id === parseInt(id));
    if (!item) {
      updateSellCalculation({ gold_item_id: 0, gold_item_label: '', weight_grams: '' });
      return;
    }
    const estGrams = parseSubtypeToGrams(item.subtype);
    updateSellCalculation({
      gold_item_id: item.id,
      gold_item_label: `${item.type} — ${item.subtype}`,
      weight_grams: estGrams
    });
  }

  const handleSave = async () => {
    setError(null)
    if (!sell.gold_item_id) { setError('กรุณาเลือกประเภทและรุ่นของทองที่จะขาย'); return }
    if (!sell.price_per_baht) { setError('กรุณากรอกราคาทองคำแท่งอ้างอิง'); return }
    if (!sell.weight_grams) { setError('กรุณากรอกน้ำหนักชั่งจริง (กรัม)'); return }
    if (!sell.total_amount) { setError('กรุณากรอกราคารวมขาย'); return }

    setSaving(true)
    try {
      const priceID = todayPrice?.id || 0
      const purityPct = sell.purity === 'อื่นๆ' ? sell.purity_custom : sell.purity
      const displayNotes = sell.notes
        ? `${sell.notes} [ชั่งจริง: ${sell.weight_grams} ก. (ความบริสุทธิ์: ${purityPct}%)]`
        : `ชั่งจริง: ${sell.weight_grams} ก. (ความบริสุทธิ์: ${purityPct}%)`
      const finalWeightBaht = parseFloat(sell.weight_grams || 0) * 656 / 10000

      const payload = {
        type: 'sell',
        customer_id: sell.customer_id,
        gold_item_id: sell.gold_item_id,
        weight_baht: finalWeightBaht,
        gold_price_id: priceID,
        price_per_baht: parseFloat(String(sell.price_per_baht).replace(/,/g, '')),
        total_amount: parseFloat(String(sell.total_amount).replace(/,/g, '') || 0),
        notes: displayNotes,
        date: sell.date,
        item_type: '', purity: '', description: '',
      }

      if (onAdd) {
        onAdd({
          ...payload,
          label: sell.gold_item_label,
          notes: payload.notes
        })
      } else {
        await CreateSale(payload)
        onSaved()
      }
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="section-divider">เลือกรายการทอง</div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label form-label-required">ประเภทสินค้าหลัก</label>
            <select
              className="input"
              value={selectedMainType}
              onChange={e => {
                setSelectedMainType(e.target.value);
                updateSellCalculation({ gold_item_id: 0, weight_grams: '' });
              }}
            >
              <option value="">-- เลือกประเภทหลัก --</option>
              {MAIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">เลือกขนาด / รุ่น (Subtype)</label>
            <select
              className="input"
              value={sell.gold_item_id || ''}
              disabled={!selectedMainType}
              onChange={e => selectSubtypeById(e.target.value)}
            >
              <option value="">-- เลือกรุ่น/น้ำหนัก --</option>
              {selectedMainType && goldItems
                .filter(item => item.type === selectedMainType)
                .map(item => (
                  <option key={item.id} value={item.id}>{item.subtype}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="section-divider">รายละเอียดการชั่งน้ำหนัก & คำนวณราคา</div>

        <div className="form-row form-row-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label form-label-required">น้ำหนัก (กรัม)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.0001"
              placeholder="0.00"
              value={sell.weight_grams}
              onChange={e => updateSellCalculation({ weight_grams: e.target.value })}
              disabled={!sell.gold_item_id}
            />
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">ความบริสุทธิ์ (%)</label>
            <select
              className="input"
              value={sell.purity}
              onChange={e => updateSellCalculation({ purity: e.target.value })}
              disabled={!sell.gold_item_id}
            >
              {PURITY_OPTIONS.map(p => (
                <option key={p} value={p}>{p === 'อื่นๆ' ? 'อื่นๆ (กรอกเอง)' : `${p}%`}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">ทองแท่งอ้างอิง (บาท)</label>
            <input
              className="input"
              type="text"
              value={formatNumberInput(sell.price_per_baht)}
              onChange={e => updateSellCalculation({ price_per_baht: e.target.value })}
              onBlur={e => updateSellCalculation({ price_per_baht: formatCurrency(e.target.value) })}
              placeholder="0.00"
              disabled={!sell.gold_item_id}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ค่ากำเหน็จ (บาท)</label>
            <input
              className="input"
              type="text"
              value={formatNumberInput(sell.labor_fee)}
              onChange={e => updateSellCalculation({ labor_fee: e.target.value })}
              onBlur={e => updateSellCalculation({ labor_fee: formatCurrency(e.target.value) })}
              placeholder="0.00"
              disabled={!sell.gold_item_id}
            />
          </div>
        </div>

        {sell.purity === 'อื่นๆ' && (
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label className="form-label form-label-required">ระบุความบริสุทธิ์เอง (%)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="เช่น 92.5"
              value={sell.purity_custom}
              onChange={e => updateSellCalculation({ purity_custom: e.target.value })}
            />
          </div>
        )}

        {/* ── Sell Total & Discount Adjustments ── */}
        {sellTotal > 0 && (
          <>
            <div className="nsf-total nsf-total-sell">
              <span className="nsf-total-label">ยอดรวมสุทธิ</span>
              <div style={{ textAlign: 'right' }}>
                <span className="nsf-total-amount">
                  {formatBaht(sellTotal)}
                </span>

                {/* Small subtext breakdown */}
                {sell.calculated_gold_price > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    (ราคาทอง: {formatBaht(sell.calculated_gold_price)} {sell.labor_fee ? `+ ค่ากำเหน็จ: ${formatBaht(parseFloat(String(sell.labor_fee).replace(/,/g, '')))}` : ''})
                  </div>
                )}
              </div>
            </div>

            {/* Quick Negotiated Price Input */}
            {sell.calculated_gold_price > 0 && (
              <div className="form-group" style={{ marginTop: '12px', background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px' }}>
                <label className="form-label">ราคาตกลงขายใหม่ (ปรับส่วนลดอัตโนมัติ)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="กรอกราคาที่ลูกค้าต่อรอง..."
                    value={formatNumberInput(sell.negotiated_price)}
                    onChange={e => updateSellCalculation({ negotiated_price: e.target.value })}
                    onBlur={e => updateSellCalculation({ negotiated_price: formatCurrency(e.target.value) })}
                    style={{ flex: 1, fontSize: '15px', fontWeight: 'bold' }}
                  />
                  {sell.discount > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--amber)', fontWeight: 'bold' }}>
                      <IconTag /> ส่วนลด: {formatBaht(sell.discount)} บ.
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <CustomerNoteSection
          tabMode="sell"
          customerId={sell.customer_id}
          customerLabel={sell.customer_label}
          notes={sell.notes}
          onCustomerSelect={(c) => {
            setSell(prev => ({ ...prev, customer_id: c.id, customer_label: fullName(c) }))
          }}
          onCustomerClear={() => setSell(prev => ({ ...prev, customer_id: 0, customer_label: '' }))}
          onNotesChange={(text) => setSell(prev => ({ ...prev, notes: text }))}
        />
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกการขาย'}
        </button>
      </div>
    </>
  )
}

function IconTag() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> }
