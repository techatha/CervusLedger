import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { GetCustomers } from 'wailsjs/go/customer_handler/CustomerHandler.js'
import { fullName } from '@/utils/thai.js'
import { SMARTCARD_EVENTS } from '@/utils/smartcard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserPlus } from '@fortawesome/free-solid-svg-icons'
import CustomerForm from '@/pages/customers/CustomerForm.jsx'

export default function CustomerNoteSection({ 
  tabMode,         // 'sell' or 'buy'
  isCustomerRequired = false, // optional override
  customerId,      // current selected ID
  customerLabel,   // current selected Name
  notes,           // current notes
  onCustomerSelect, 
  onCustomerClear,
  onNotesChange 
}) {
  const [custSearch, setCustSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [showCustDrop, setShowCustDrop] = useState(false)
  const [showAddCustModal, setShowAddCustModal] = useState(false)
  const custRef = useRef(null)

  const required = tabMode === 'buy' || isCustomerRequired

  // Auto-fetch customers when typing
  useEffect(() => {
    if (!custSearch) { setCustomers([]); return }
    const t = setTimeout(() => {
      GetCustomers(custSearch).then(d => setCustomers(d || []))
    }, 200)
    return () => clearTimeout(t)
  }, [custSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (custRef.current && !custRef.current.contains(e.target)) {
        setShowCustDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Handle auto-selection from smart card events (insertion or registration)
  useEffect(() => {
    const handleSmartcardSelect = (e) => {
      const c = e.detail?.customer
      if (c) {
        console.log('[CustomerNoteSection] Smartcard selection event triggered for customer:', c)
        const name = fullName(c)
        onCustomerSelect(c)
        setCustSearch(name)
        setShowCustDrop(false)
        setCustomers([])
      }
    }
    window.addEventListener(SMARTCARD_EVENTS.SALE_SELECT, handleSmartcardSelect)
    return () => window.removeEventListener(SMARTCARD_EVENTS.SALE_SELECT, handleSmartcardSelect)
  }, [onCustomerSelect])

  const handleSelect = (c) => {
    onCustomerSelect(c)
    setCustSearch(fullName(c))
    setShowCustDrop(false)
    setCustomers([])
  }

  const handleSearchChange = (e) => {
    setCustSearch(e.target.value)
    onCustomerClear()
    setShowCustDrop(true)
  }

  return (
    <>
      <div className="section-divider">ลูกค้า & หมายเหตุ</div>
      <div className="form-row form-row-2">
        
        <div className="form-group" ref={custRef}>
          <label className={`form-label ${required ? 'form-label-required' : ''}`}>
            {required ? 'ลูกค้า' : 'ลูกค้า (ไม่บังคับ)'}
          </label>
          <div style={{ position: 'relative' }}>
            {showCustDrop && customers.length > 0 && (
              <div className="nsf-dropdown" style={{ bottom: 'calc(100% + 4px)', top: 'auto', zIndex: 100 }}>
                {customers.map(c => (
                  <div key={c.id} className="nsf-drop-item" onMouseDown={() => handleSelect(c)}>
                    <span className="nsf-drop-name">{fullName(c)}</span>
                    {c.phone && <span className="nsf-drop-desc">{c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
            <input
              className="input"
              placeholder="ค้นหาชื่อหรือเบอร์..."
              value={custSearch}
              onChange={handleSearchChange}
              onFocus={() => custSearch && setShowCustDrop(true)}
            />
          </div>

          {customerId > 0 && (
            <div className="nsf-selected-item" style={{ marginTop: '6px' }}>
              <IconCheck /> {customerLabel}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                color: 'var(--amber)',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: 'rgba(217, 119, 6, 0.06)',
                border: '1px solid var(--amber)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500
              }}
              onClick={() => setShowAddCustModal(true)}
              title="เพิ่มลูกค้าใหม่"
            >
              <FontAwesomeIcon icon={faUserPlus} />
              เพิ่มลูกค้าใหม่
            </button>
          </div>
        </div>

        {/* Notes Input */}
        <div className="form-group">
          <label className="form-label">หมายเหตุ</label>
          <input
            className="input"
            placeholder="(ไม่บังคับ)"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
          />
        </div>
      </div>

      {showAddCustModal && createPortal(
        <CustomerForm
          customerId={null}
          onSaved={() => setShowAddCustModal(false)}
          onClose={() => setShowAddCustModal(false)}
        />,
        document.body
      )}
    </>
  )
}

function IconCheck() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> }