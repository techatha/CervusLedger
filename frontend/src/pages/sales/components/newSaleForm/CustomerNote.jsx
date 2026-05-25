import { useState, useEffect, useRef } from 'react'
import { GetCustomers } from 'wailsjs/go/handlers/CustomerHandler.js'
import { fullName } from '@/utils/thai.js'

export default function CustomerNoteSection({ 
  tabMode,         // 'sell' or 'buy'
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
  const custRef = useRef(null)

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
        
        {/* Customer Autocomplete */}
        <div className="form-group" ref={custRef} style={{ position: 'relative' }}>
          <label className={`form-label ${tabMode === 'buy' ? 'form-label-required' : ''}`}>
            {tabMode === 'buy' ? 'ลูกค้า' : 'ลูกค้า (ไม่บังคับ)'}
          </label>
          <input
            className="input"
            placeholder="ค้นหาชื่อหรือเบอร์..."
            value={custSearch}
            onChange={handleSearchChange}
            onFocus={() => custSearch && setShowCustDrop(true)}
          />
          
          {customerId > 0 && (
            <div className="nsf-selected-item">
              <IconCheck /> {customerLabel}
            </div>
          )}
          
          {showCustDrop && customers.length > 0 && (
            <div className="nsf-dropdown">
              {customers.map(c => (
                <div key={c.id} className="nsf-drop-item" onMouseDown={() => handleSelect(c)}>
                  <span className="nsf-drop-name">{fullName(c)}</span>
                  {c.phone && <span className="nsf-drop-desc">{c.phone}</span>}
                </div>
              ))}
            </div>
          )}
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
    </>
  )
}

function IconCheck() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> }