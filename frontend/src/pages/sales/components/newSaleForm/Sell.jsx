import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTag } from '@fortawesome/free-solid-svg-icons'
import { ListGoldItems } from 'wailsjs/go/handlers/GoldItemHandler.js'
import { formatBaht, fullName, toBE } from '@/utils/thai.js'
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
  labor_fee: '',
  total_amount: '', // final calculated sell price (without discount)
  calculated_gold_price: 0,
  notes: '',
  date: today(),

  // Grams & Purity calculation inputs
  weight_grams: '',
  purity: '90', // default 90%
  purity_custom: '',
}

export default function NewSaleFormSell({ todayPrice, saving, error, setError, onSave, onClose }) {

  const [sell, setSell] = useState({
    ...BLANK_SELL,
    price_per_baht: todayPrice ? String(todayPrice.sell_price_per_baht) : '',
  })

  // NEW: Separate state for negotiated discount logic (Decoupled from sell.total_amount)
  const [negotiatedPrice, setNegotiatedPrice] = useState('')
  const [isNegotiatedEdited, setIsNegotiatedEdited] = useState(false)
  const [showNegotiated, setShowNegotiated] = useState(false)

  const [goldItems, setGoldItems] = useState([])
  const [selectedMainType, setSelectedMainType] = useState('')

  // Load available gold items on mount
  useEffect(() => {
    ListGoldItems('available').then(d => setGoldItems(d || []))
  }, [])

  const sellTotal = sell.total_amount ? parseFloat(sell.total_amount || 0) : 0

  // Reset manual edit flag and visibility when gold_item_id changes
  useEffect(() => {
    setIsNegotiatedEdited(false)
    setNegotiatedPrice('')
    setShowNegotiated(false)
  }, [sell.gold_item_id])

  // Sync negotiatedPrice with sellTotal initially or when sellTotal changes, until manually edited
  useEffect(() => {
    if (sellTotal === 0) {
      setIsNegotiatedEdited(false)
      setNegotiatedPrice('')
    } else if (!isNegotiatedEdited) {
      setNegotiatedPrice(String(sellTotal))
    }
  }, [sellTotal, isNegotiatedEdited])

  // Calculate dynamically for rendering
  const parsedNegotiated = parseFloat(String(negotiatedPrice)) || 0
  const hasDiscount = parsedNegotiated != sellTotal
  const discountAmount = hasDiscount ? sellTotal - parsedNegotiated : 0

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

  const handleSave = () => {
    setError(null)
    if (!sell.gold_item_id) { setError('กรุณาเลือกประเภทและรุ่นของทองที่จะขาย'); return }
    if (!sell.price_per_baht) { setError('กรุณากรอกราคาทองคำแท่งอ้างอิง'); return }
    if (!sell.weight_grams) { setError('กรุณากรอกน้ำหนักชั่งจริง (กรัม)'); return }
    if (!sell.total_amount) { setError('กรุณากรอกราคารวมขาย'); return }

    const priceID = todayPrice?.id || 0
    const purityPct = sell.purity === 'อื่นๆ' ? sell.purity_custom : sell.purity
    const displayNotes = sell.notes
      ? `${sell.notes} [ชั่งจริง: ${sell.weight_grams} ก. (ความบริสุทธิ์: ${purityPct}%)]`
      : `ชั่งจริง: ${sell.weight_grams} ก. (ความบริสุทธิ์: ${purityPct}%)`
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
              {MAIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">เลือกรุ่น/น้ำหนัก </label>
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

        {/* ── Sell Total view ── */}
        {sellTotal > 0 && (
          <>
            <div style={{ marginTop: '16px', marginBottom: '8px' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={showNegotiated}
                  onChange={e => {
                    setShowNegotiated(e.target.checked)
                    if (!e.target.checked) {
                      setIsNegotiatedEdited(false)
                      setNegotiatedPrice('')
                    }
                  }}
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>ปรับราคาตกลงขายใหม่ (ต่อรองราคา / ให้ส่วนลดพิเศษ)</span>
              </label>
            </div>

            {/* ── Quick Negotiated Price Input (Moved BELOW Customer Section) ── */}
            {showNegotiated && (
              <div className="form-group" style={{ marginTop: '8px', background: 'var(--red-bg)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--red)', marginBottom: '12px' }}>
                <label className="form-label" style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  ราคาตกลงขายใหม่ (ส่วนลดจะถูกเพิ่มลงตะกร้าแยกอัตโนมัติ)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    className="input input-negotiated"
                    type="text"
                    placeholder="กรอกราคาที่ลูกค้าต่อรอง..."
                    value={formatNumberInput(negotiatedPrice)}
                    onChange={e => {
                      setIsNegotiatedEdited(true)
                      setNegotiatedPrice(e.target.value)
                    }}
                    onBlur={e => setNegotiatedPrice(formatCurrency(e.target.value))}
                    disabled={!sell.gold_item_id}
                    style={{ width: '100%', fontSize: '16px', fontWeight: 'bold' }}
                  />
                  {hasDiscount && (
                    <span style={{ fontSize: '13.5px', color: 'var(--red)', fontWeight: 'bold' }}>
                      <FontAwesomeIcon icon={faTag} /> ลดไป: {formatBaht(discountAmount)} บ.
                    </span>
                  )}
                </div>
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
