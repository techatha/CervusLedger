import { useState, useEffect } from 'react'
import { GetAllSettings, SaveAllSettings } from 'wailsjs/go/handlers/SettingsHandler'
import './SettingsPage.css'

const DEFAULTS = {
  shop_name:            '',
  shop_address:         '',
  shop_phone:           '',
  buy_price_per_baht:   '',
  sell_price_per_baht:  '',
  buying_difference:    '0',
  interest_rate_low:    '0.3',
  interest_rate_high:   '0.2',
  interest_threshold:   '10000',
  min_interest_amount:  '20',
  last_ticket_number:   '0',
  pawn_legal_terms:     '',
}

export default function SettingsPage() {
  const [form,    setForm]    = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    GetAllSettings()
      .then(data => setForm(prev => ({ ...prev, ...data })))
      .catch(e => setError('โหลดการตั้งค่าไม่สำเร็จ: ' + e))
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await SaveAllSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="page-view">
      <div className="empty-state"><div className="empty-state-text">กำลังโหลด...</div></div>
    </div>
  )

  return (
    <div className="page-view">
      <div className="page-header">
        <div>
          <div className="page-title">ตั้งค่า</div>
          <div className="page-meta">ข้อมูลร้านและค่าพารามิเตอร์</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {saved && (
            <span className="sp-saved-badge">
              <IconCheck /> บันทึกแล้ว
            </span>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="sp-layout">
        {/* ── Shop Info ── */}
        <section className="card sp-section">
          <div className="card-header">
            <span className="card-title">ข้อมูลร้าน</span>
          </div>
          <div className="sp-fields">
            <Field label="ชื่อร้าน" required>
              <input
                className="input"
                value={form.shop_name}
                onChange={e => set('shop_name', e.target.value)}
                placeholder="ร้านทองสมศรี"
              />
            </Field>
            <Field label="ที่อยู่ร้าน">
              <input
                className="input"
                value={form.shop_address}
                onChange={e => set('shop_address', e.target.value)}
                placeholder="123/4 ถ.เชียงใหม่-ลำพูน ต.ช้างม่อย อ.เมือง จ.เชียงใหม่"
              />
            </Field>
            <Field label="เบอร์โทรศัพท์">
              <input
                className="input"
                value={form.shop_phone}
                onChange={e => set('shop_phone', e.target.value)}
                placeholder="053-123456"
              />
            </Field>
          </div>
        </section>

        {/* ── Gold Prices ── */}
        <section className="card sp-section">
          <div className="card-header">
            <span className="card-title">ราคาทองเริ่มต้น</span>
            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:400 }}>
              ราคาจริงตั้งได้จากหน้าซื้อ-ขาย
            </span>
          </div>
          <div className="sp-fields">
            <div className="form-row form-row-2">
              <Field label="ราคาขาย (บาท/บาท)">
                <input
                  className="input"
                  type="number"
                  value={form.sell_price_per_baht}
                  onChange={e => set('sell_price_per_baht', e.target.value)}
                  placeholder="32000"
                />
              </Field>
              <Field label="ราคารับซื้อ (บาท/บาท)">
                <input
                  className="input"
                  type="number"
                  value={form.buy_price_per_baht}
                  onChange={e => set('buy_price_per_baht', e.target.value)}
                  placeholder="31500"
                />
              </Field>
            </div>
            <Field label="ส่วนต่างราคารับซื้อทองคำแท่ง (บาท/บาท)" hint="ใช้หักลบราคาอ้างอิงตอนคำนวณราคารับซื้อ">
              <input
                className="input"
                type="number"
                value={form.buying_difference}
                onChange={e => set('buying_difference', e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
        </section>

        {/* ── Interest Rates ── */}
        <section className="card sp-section">
          <div className="card-header">
            <span className="card-title">อัตราดอกเบี้ยจำนำ</span>
          </div>
          <div className="sp-fields">
            <div className="sp-rate-explainer">
              <span>ต้นเงิน &lt; {parseInt(form.interest_threshold||0).toLocaleString('th-TH')} บาท</span>
              <span className="sp-arrow">→</span>
              <span className="sp-rate-val">{form.interest_rate_low}% / เดือน</span>
              <span className="sp-divider">|</span>
              <span>ต้นเงิน ≥ {parseInt(form.interest_threshold||0).toLocaleString('th-TH')} บาท</span>
              <span className="sp-arrow">→</span>
              <span className="sp-rate-val">{form.interest_rate_high}% / เดือน</span>
            </div>

            <div className="form-row form-row-3">
              <Field label="อัตราต่ำ (% / เดือน)" hint="ต้นต่ำกว่า threshold">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.interest_rate_low}
                  onChange={e => set('interest_rate_low', e.target.value)}
                />
              </Field>
              <Field label="อัตราสูง (% / เดือน)" hint="ต้นตั้งแต่ threshold">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.interest_rate_high}
                  onChange={e => set('interest_rate_high', e.target.value)}
                />
              </Field>
              <Field label="Threshold (บาท)">
                <input
                  className="input"
                  type="number"
                  step="1000"
                  value={form.interest_threshold}
                  onChange={e => set('interest_threshold', e.target.value)}
                />
              </Field>
            </div>

            <Field label="ดอกเบี้ยขั้นต่ำ (บาท/เดือน)">
              <input
                className="input"
                type="number"
                value={form.min_interest_amount}
                onChange={e => set('min_interest_amount', e.target.value)}
                style={{ maxWidth:180 }}
              />
            </Field>
          </div>
        </section>

        {/* ── Ticket Number ── */}
        <section className="card sp-section">
          <div className="card-header">
            <span className="card-title">เลขตั๋ว</span>
          </div>
          <div className="sp-fields">
            <Field
              label="เลขตั๋วล่าสุด"
              hint="ตั๋วถัดไปจะเป็นเลขนี้ + 1 (รีเซ็ตเป็น 1 หลังจาก 9999)"
            >
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="9999"
                  value={form.last_ticket_number}
                  onChange={e => set('last_ticket_number', e.target.value)}
                  style={{ maxWidth:140 }}
                />
                <span style={{ fontSize:13, color:'var(--text-muted)' }}>
                  ตั๋วถัดไป:{' '}
                  <strong style={{ color:'var(--gold)', fontFamily:'Courier New' }}>
                    {String((parseInt(form.last_ticket_number||0) % 9999) + 1).padStart(4,'0')}
                  </strong>
                </span>
              </div>
            </Field>
          </div>
        </section>

        {/* ── Pawn Legal Terms ── */}
        <section className="card sp-section">
          <div className="card-header">
            <span className="card-title">เงื่อนไขและข้อตกลงตั๋วจำนำ</span>
          </div>
          <div className="sp-fields">
            <Field
              label="ข้อความเงื่อนไข"
              hint="สามารถเน้นข้อความตัวหนาด้วย <bold>ข้อความ</bold> และขีดเส้นใต้ด้วย <underline>ข้อความ</underline> ได้"
            >
              <textarea
                className="input"
                style={{ height: 'auto', minHeight: '120px', lineHeight: '1.6', resize: 'vertical' }}
                value={form.pawn_legal_terms || ''}
                onChange={e => set('pawn_legal_terms', e.target.value)}
                placeholder="กรอกข้อความเงื่อนไขทางกฎหมายสำหรับแสดงบนตั๋วจำนำ..."
              />
            </Field>
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({ label, hint, required, children }) {
  return (
    <div className="form-group sp-field">
      <label className="form-label">
        {label}
        {required && <span style={{ color:'var(--red)' }}> *</span>}
      </label>
      {children}
      {hint && <div className="sp-hint">{hint}</div>}
    </div>
  )
}

function IconCheck() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
}
