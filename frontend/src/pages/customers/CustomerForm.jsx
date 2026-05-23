import { useState, useEffect, useRef } from 'react'
import {
  GetCustomer,
  CreateCustomer,
  UpdateCustomer,
} from '../../../wailsjs/go/handlers/CustomerHandler'
import {
  ReadSmartCard,
} from '../../../wailsjs/go/handlers/SmartCardHandler'
import { PREFIXES, PROVINCES } from '../../utils/thai'
import { useNavigate } from 'react-router-dom'
import './CustomerForm.css'

const BLANK = {
  id:           0,
  prefix:       'นาย',
  firstname:    '',
  lastname:     '',
  phone:        '',
  id_card:      '',
  address_no:   '',
  address_line: '',
  moo:          '',
  road:         '',
  tambon:       '',
  amphoe:       '',
  province:     'เชียงใหม่',
}

export default function CustomerForm({ customerId, onSaved, onClose, initialCardData }) {
  const isEdit = !!customerId
  const navigate = useNavigate()

  const [form,         setForm]         = useState(BLANK)
  const [loading,      setLoading]      = useState(isEdit)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)
  const [cardReading,  setCardReading]  = useState(false)
  const [cardSuccess,  setCardSuccess]  = useState(false)

  const formRef = useRef(form)
  formRef.current = form

  // Load existing customer for edit or pre-populate with smart card data
  useEffect(() => {
    if (isEdit) {
      GetCustomer(customerId)
        .then(c => setForm({ ...BLANK, ...c }))
        .catch(e => setError('โหลดข้อมูลไม่สำเร็จ: ' + e))
        .finally(() => setLoading(false))
    } else if (initialCardData) {
      setForm(prev => ({
        ...prev,
        prefix:       initialCardData.prefix       || prev.prefix,
        firstname:    initialCardData.firstname     || prev.firstname,
        lastname:     initialCardData.lastname      || prev.lastname,
        id_card:      initialCardData.id_card       || prev.id_card,
        address_no:   initialCardData.address_no    || prev.address_no,
        moo:          initialCardData.moo           || prev.moo,
        road:         initialCardData.road          || prev.road,
        tambon:       initialCardData.tambon        || prev.tambon,
        amphoe:       initialCardData.amphoe        || prev.amphoe,
        province:     initialCardData.province      || prev.province,
      }))
      setCardSuccess(true)
      setTimeout(() => setCardSuccess(false), 3000)
      setLoading(false)
    }
  }, [customerId, isEdit, initialCardData])

  // Listen to card insertion while this form is open
  useEffect(() => {
    const handleSmartCardInsert = (e) => {
      const card = e.detail?.card
      if (!card) return
      
      const currentForm = formRef.current
      const hasTypedData = (currentForm.firstname || '').trim() || 
                           (currentForm.lastname || '').trim() || 
                           (currentForm.phone || '').trim() || 
                           (currentForm.id_card || '').trim()
      
      if (hasTypedData) {
        const confirmImport = window.confirm('พบการเสียบบัตรประชาชน ต้องการนำเข้าข้อมูลจากบัตรทับข้อมูลที่กรอกอยู่หรือไม่?')
        if (!confirmImport) return
      }

      setForm(prev => ({
        ...prev,
        prefix:       card.prefix       || prev.prefix,
        firstname:    card.firstname     || prev.firstname,
        lastname:     card.lastname      || prev.lastname,
        id_card:      card.id_card       || prev.id_card,
        address_no:   card.address_no    || prev.address_no,
        moo:          card.moo           || prev.moo,
        road:         card.road          || prev.road,
        tambon:       card.tambon        || prev.tambon,
        amphoe:       card.amphoe        || prev.amphoe,
        province:     card.province      || prev.province,
      }))
      setCardSuccess(true)
      setTimeout(() => setCardSuccess(false), 3000)
    }

    window.addEventListener('smartcard-insert', handleSmartCardInsert)
    return () => window.removeEventListener('smartcard-insert', handleSmartCardInsert)
  }, [])

  const set = (field, val) =>
    setForm(prev => ({ ...prev, [field]: val }))

  const handleInput = e => set(e.target.name, e.target.value)

  // Smart card reader
  const handleReadCard = async () => {
    setCardReading(true)
    setError(null)
    setCardSuccess(false)
    try {
      const card = await ReadSmartCard()
      setForm(prev => ({
        ...prev,
        prefix:       card.prefix       || prev.prefix,
        firstname:    card.firstname     || prev.firstname,
        lastname:     card.lastname      || prev.lastname,
        id_card:      card.id_card       || prev.id_card,
        address_no:   card.address_no    || prev.address_no,
        moo:          card.moo           || prev.moo,
        road:         card.road          || prev.road,
        tambon:       card.tambon        || prev.tambon,
        amphoe:       card.amphoe        || prev.amphoe,
        province:     card.province      || prev.province,
      }))
      setCardSuccess(true)
      setTimeout(() => setCardSuccess(false), 3000)
    } catch (e) {
      setError('อ่านบัตรไม่สำเร็จ — ' + e)
    } finally {
      setCardReading(false)
    }
  }

  const validate = () => {
    if (!form.firstname.trim()) return 'กรุณากรอกชื่อ'
    if (!form.lastname.trim())  return 'กรุณากรอกนามสกุล'
    if (form.id_card && !/^\d{13}$/.test(form.id_card.replace(/\D/g, '')))
      return 'เลขบัตรประชาชนต้องมี 13 หลัก'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        id_card: form.id_card.replace(/\D/g, '') || null,
      }
      if (isEdit) {
        await UpdateCustomer(payload)
        onSaved()
      } else {
        const newId = await CreateCustomer(payload)
        
        // Dispatch select event for NewPawnForm to catch
        const matched = {
          id: newId,
          prefix: form.prefix,
          firstname: form.firstname,
          lastname: form.lastname,
          phone: form.phone,
          id_card: payload.id_card,
        }
        window.dispatchEvent(new CustomEvent('smartcard-pawn-select', { detail: { customer: matched } }))
        
        onSaved(newId)
        
        const isPawnFormOpen = document.querySelector('.npf-modal') !== null
        if (!isPawnFormOpen) {
          navigate(`/customers/${newId}`)
        }
      }
    } catch (e) {
      setError('บันทึกไม่สำเร็จ: ' + e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal cf-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            {isEdit ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
          </div>
          <div className="cf-header-right">
            <button
              className={`btn btn-sm ${cardSuccess ? 'btn-card-success' : 'btn-ghost'}`}
              onClick={handleReadCard}
              disabled={cardReading || loading}
              title="อ่านบัตรประชาชน"
            >
              <IconCard />
              {cardReading ? 'กำลังอ่าน...' : cardSuccess ? 'อ่านสำเร็จ ✓' : 'อ่านบัตร'}
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-text">กำลังโหลด...</div>
            </div>
          ) : (
            <>
              {error && <div className="alert alert-error">{error}</div>}

              {/* ── ข้อมูลส่วนตัว ── */}
              <div className="section-divider">ข้อมูลส่วนตัว</div>

              <div className="form-row" style={{ gridTemplateColumns: '130px 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">คำนำหน้า</label>
                  <select
                    name="prefix"
                    className="input"
                    value={form.prefix}
                    onChange={handleInput}
                  >
                    {PREFIXES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">ชื่อ</label>
                  <input
                    name="firstname"
                    className="input"
                    value={form.firstname}
                    onChange={handleInput}
                    placeholder="ชื่อจริง"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">นามสกุล</label>
                  <input
                    name="lastname"
                    className="input"
                    value={form.lastname}
                    onChange={handleInput}
                    placeholder="นามสกุล"
                  />
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์</label>
                  <input
                    name="phone"
                    className="input"
                    value={form.phone}
                    onChange={handleInput}
                    placeholder="0xx-xxx-xxxx"
                    maxLength={15}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">เลขบัตรประชาชน</label>
                  <input
                    name="id_card"
                    className="input"
                    value={form.id_card}
                    onChange={handleInput}
                    placeholder="1 xxxx xxxxx xx x"
                    maxLength={17}
                  />
                </div>
              </div>

              {/* ── ที่อยู่ ── */}
              <div className="section-divider">ที่อยู่</div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">บ้านเลขที่</label>
                  <input
                    name="address_no"
                    className="input"
                    value={form.address_no}
                    onChange={handleInput}
                    placeholder="ตัวอย่าง: 888/8"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">หมู่ที่</label>
                  <input
                    name="moo"
                    className="input"
                    value={form.moo}
                    onChange={handleInput}
                    placeholder="ตัวอย่าง: 8"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full">
                  <label className="form-label">ที่อยู่เพิ่มเติม (อาคาร, ซอย ฯลฯ)</label>
                  <input
                    name="address_line"
                    className="input"
                    value={form.address_line}
                    onChange={handleInput}
                    placeholder="ซอย, อาคาร, หมู่บ้าน"
                  />
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">ถนน</label>
                  <input
                    name="road"
                    className="input"
                    value={form.road}
                    onChange={handleInput}
                    placeholder="ถนน"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ตำบล/แขวง</label>
                  <input
                    name="tambon"
                    className="input"
                    value={form.tambon}
                    onChange={handleInput}
                    placeholder="ตำบล"
                  />
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">อำเภอ/เขต</label>
                  <input
                    name="amphoe"
                    className="input"
                    value={form.amphoe}
                    onChange={handleInput}
                    placeholder="อำเภอ"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">จังหวัด</label>
                  <select
                    name="province"
                    className="input"
                    value={form.province}
                    onChange={handleInput}
                  >
                    <option value="">— เลือกจังหวัด —</option>
                    {PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            ยกเลิก
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IconCard() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )
}
