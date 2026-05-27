import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTag, faCheck, faPen } from '@fortawesome/free-solid-svg-icons'
import { ListGoldItems } from 'wailsjs/go/handlers/GoldItemHandler.js'
import { formatBaht, fullName, toBE } from '@/utils/thai.js'
import { formatNumberInput, formatCurrency } from '@/utils/number.js'
import CustomerNoteSection from './CustomerNote.jsx'
import { getGoldMainTypes, getGoldSubtypes } from '@/utils/constants.js'

const today = () => new Date().toISOString().slice(0, 10)

const BLANK_SELL = {
  gold_item_id: 0,
  gold_item_label: '',
  gold_item_weight: 0,
  customer_id: 0,
  customer_label: '',
  price_per_baht: '',
  labor_fee: '',
  total_amount: '', // final calculated sell price (without discount)
  calculated_gold_price: 0,
  notes: '',
  date: today(),

  // Grams & Purity calculation inputs
  weight_grams: '',
  purity: '0', // none selected => 0
}

export default function NewSaleFormSell({ todayPrice, saving, error, setError, onSave, onClose }) {

  const [sell, setSell] = useState({
    ...BLANK_SELL,
    price_per_baht: todayPrice ? String(todayPrice.sell_price_per_baht) : '',
  })

  const [negotiatedPrice, setNegotiatedPrice] = useState('')
  const [negotiationMode, setNegotiationMode] = useState('off')

  const [goldItems, setGoldItems] = useState([])
  const [mainTypes, setMainTypes] = useState([])
  const [subtypes, setSubtypes] = useState([])
  const [selectedMainType, setSelectedMainType] = useState('')

  // Load available gold items on mount
  useEffect(() => {
    ListGoldItems('available').then(d => setGoldItems(d || []))
    getGoldMainTypes().then(setMainTypes)
  }, [])

  // Load subtypes when main type changes
  useEffect(() => {
    if (selectedMainType) {
      getGoldSubtypes(selectedMainType).then(setSubtypes)
    } else {
      setSubtypes([])
    }
  }, [selectedMainType])

  const sellTotal = sell.total_amount ? parseFloat(sell.total_amount || 0) : 0

  // Reset negotiation completely when picking a new gold item
  useEffect(() => {
    setNegotiationMode('off')
    setNegotiatedPrice('')
  }, [sell.gold_item_id])

  // Calculate dynamically
  const parsedNegotiated = parseFloat(String(negotiatedPrice).replace(/,/g, '')) || 0
  // Only calculate discount if the feature is turned on
  const hasDiscount = negotiationMode !== 'off' && parsedNegotiated !== sellTotal
  const discountAmount = hasDiscount ? sellTotal - parsedNegotiated : 0

  // Apply button handler
  const handleApplyNegotiated = () => {
    const cleanValue = parseFloat(negotiatedPrice)
    if (!isNaN(cleanValue)) {
      setNegotiatedPrice(String(cleanValue))
    }
    setNegotiationMode('view')
  }

  const updateSellCalculation = (updatedFields) => {
    setSell(prev => {
      const next = { ...prev, ...updatedFields }

      // Strip commas for calculation
      const basePrice = parseFloat(String(next.price_per_baht).replace(/,/g, '') || 0)
      const labor = parseFloat(String(next.labor_fee).replace(/,/g, '') || 0)
      const weightG = parseFloat(next.weight_grams || 0)
      const purityVal = parseFloat(next.purity || 0)

      // Calculate pure gold price
      let calculatedGold = 0
      if (basePrice && weightG && purityVal) {
        calculatedGold = Math.round(basePrice * (purityVal / 100) * 656 * weightG / 10000)
      }

      // The raw total ONLY calculates the item value + labor fee. 
      // Discount logic is decoupled to a separate state & payload.
      const rawTotal = calculatedGold + labor

      return {
        ...next,
        calculated_gold_price: calculatedGold,
        total_amount: rawTotal > 0 ? String(rawTotal) : ''
      }
    })
  }

  const selectSubtypeByName = (subtypeName) => {
    if (!subtypeName) {
      updateSellCalculation({ gold_item_id: 0, gold_item_label: '', weight_grams: '', purity: '0' });
      return;
    }
    const item = goldItems.find(g => g.type === selectedMainType && g.subtype === subtypeName);
    if (!item) {
      // Allow selection visually but reset ID since it's not in stock
      updateSellCalculation({ gold_item_id: 0, gold_item_label: '', weight_grams: '', purity: '0' });
      return;
    }
    updateSellCalculation({
      gold_item_id: item.id,
      gold_item_label: `${item.type} — ${item.subtype}`,
      weight_grams: item.weight_grams ? String(item.weight_grams) : '',
      purity: item.purity || '0'
    });
  }

  const handleSave = () => {
    setError(null)
    if (!sell.gold_item_id) { setError('กรุณาเลือกประเภทและรุ่นของทองที่จะขาย'); return }
    if (!sell.price_per_baht) { setError('กรุณากรอกราคาทองคำแท่งอ้างอิง'); return }
    if (!sell.weight_grams) { setError('กรุณากรอกน้ำหนักชั่งจริง (กรัม)'); return }
    if (!sell.total_amount) { setError('กรุณากรอกราคารวมขาย'); return }

    const priceID = todayPrice?.id || 0
    const displayNotes = sell.notes
      ? `${sell.notes} [ชั่งจริง: ${sell.weight_grams} ก. (ความบริสุทธิ์: ${sell.purity}%)]`
      : `ชั่งจริง: ${sell.weight_grams} ก. (ความบริสุทธิ์: ${sell.purity}%)`
    const finalWeightBaht = parseFloat(sell.weight_grams || 0) * 656 / 10000

    // 1. Create the primary Sell Payload
    const sellPayload = {
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
      label: sell.gold_item_label,
    }

    // 2. Create the secondary Discount Payload (if negotiated)
    let discountPayload = null;
    if (hasDiscount) {
      discountPayload = {
        type: 'discount',
        customer_id: sell.customer_id,
        gold_item_id: 0, // General discount
        weight_baht: 0,
        gold_price_id: priceID,
        price_per_baht: 0,
        total_amount: discountAmount,
        notes: `ส่วนลดพิเศษจากการต่อรองราคารายการ: ${sell.gold_item_label}`,
        date: sell.date,
        item_type: '', purity: '', description: '',
        label: 'ส่วนลดพิเศษ',
      }
    }

    onSave(sellPayload, discountPayload)
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
              {mainTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">เลือกรุ่น/น้ำหนัก </label>
            <select
              className="input"
              value={sell.gold_item_id 
                ? goldItems.find(g => g.id === sell.gold_item_id)?.subtype || '' 
                : ''}
              disabled={!selectedMainType}
              onChange={e => selectSubtypeByName(e.target.value)}
            >
              <option value="">-- เลือกรุ่น/น้ำหนัก --</option>
              {subtypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="section-divider">รายละเอียดการชั่งน้ำหนัก & คำนวณราคา</div>

        {/* ROW 1: Price and Labor */}
        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label form-label-required">ราคาทองแท่ง (บาท)</label>
            <input
              className="input"
              type="text"
              value={formatNumberInput(sell.price_per_baht)}
              onChange={e => updateSellCalculation({ price_per_baht: e.target.value })}
              onBlur={e => updateSellCalculation({ price_per_baht: formatCurrency(e.target.value) })}
              placeholder="0.00"
              disabled={!sell.gold_item_id}
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
              value={formatNumberInput(sell.labor_fee)}
              onChange={e => updateSellCalculation({ labor_fee: e.target.value })}
              onBlur={e => updateSellCalculation({ labor_fee: formatCurrency(e.target.value) })}
              placeholder="0.00"
              disabled={!sell.gold_item_id}
            />
          </div>
        </div>

        {/* ROW 2: Weight and Purity */}
        <div className="form-row form-row-2" style={{ marginTop: '12px' }}>
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
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={sell.purity}
              onChange={e => updateSellCalculation({ purity: e.target.value })}
              disabled={!sell.gold_item_id}
            />
          </div>
        </div>

        {/* ── Sell Total view ── */}
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
                      setNegotiatedPrice(String(sellTotal)) // Auto-fill current total
                    } else {
                      setNegotiationMode('off')
                      setNegotiatedPrice('')
                    }
                  }}
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>ปรับราคาตกลงขายใหม่ (ต่อรองราคา / ให้ส่วนลดพิเศษ)</span>
              </label>
            </div>

            {/* ── Quick Negotiated Price Input ── */}
            {negotiationMode !== 'off' && (
              <div className="form-group" style={{ marginTop: '8px', background: 'var(--red-bg)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--red)', marginBottom: '12px' }}>
                {negotiationMode === 'edit' ? (
                  /* ── EDIT MODE ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="form-label" style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                      ราคาตกลงขายใหม่ (ส่วนลดจะถูกเพิ่มลงตะกร้าแยกอัตโนมัติ)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        className="input input-negotiated"
                        type="number" /* เปลี่ยนกลับเป็น number ให้เด้งแป้นตัวเลขบนมือถือ */
                        min="0"
                        placeholder="กรอกราคาที่ลูกค้าต่อรอง..."
                        value={negotiatedPrice}
                        onChange={e => setNegotiatedPrice(e.target.value)} /* เก็บค่าตรงๆ ไม่ต้อง Format */
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleApplyNegotiated()
                          }
                        }}
                        style={{ flex: 1, fontSize: '16px', fontWeight: 'bold' }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleApplyNegotiated}
                        title="ยืนยันราคา"
                        style={{ height: '40px', width: '40px', padding: 0, borderRadius: '8px', background: 'var(--red)', border: 'none' }}
                      >
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
                  /* ── VIEW MODE ── */
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    {hasDiscount ? (
                      <span style={{ fontSize: '15px', color: 'var(--red)', fontWeight: 'bold' }}>
                        <FontAwesomeIcon icon={faTag} /> ลดไป: {formatBaht(discountAmount)} บ.
                      </span>
                    ) : (
                      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        ไม่มีส่วนลดเพิ่มเติม
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setNegotiationMode('edit')}
                      title="แก้ไขราคา"
                      style={{ height: '36px', width: '36px', padding: 0, borderRadius: '8px', color: 'var(--text-secondary)' }}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="nsf-total nsf-total-gold">
              <span className="nsf-total-label">ยอดรวมสุทธิ</span>
              <div style={{ textAlign: 'right' }}>
                {/* If discounted, cross out the original and show the new one */}
                {hasDiscount ? (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '16px', marginRight: '8px' }}>
                      {formatBaht(sellTotal)}
                    </span>
                    <span className="nsf-total-amount" style={{ color: 'var(--gold)' }}>
                      {formatBaht(parsedNegotiated)}
                    </span>
                  </>
                ) : (
                  <span className="nsf-total-amount">
                    {formatBaht(sellTotal)}
                  </span>
                )}

                {/* Small subtext breakdown */}
                {sell.calculated_gold_price > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    (ราคาทอง: {formatBaht(sell.calculated_gold_price)} {sell.labor_fee ? `+ ค่ากำเหน็จ: ${formatBaht(parseFloat(String(sell.labor_fee).replace(/,/g, '')))}` : ''})
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Customer & Notes Section ── */}
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
