import { useState } from 'react'
import NewSaleFormSell from './components/newSaleForm/Sell.jsx'
import NewSaleFormBuy from './components/newSaleForm/Buy.jsx'
import NewSaleFormDiscount from './components/newSaleForm/Discount.jsx'
import './NewSaleForm.css'

export default function NewSaleForm({ defaultType, todayPrice, onSaved, onClose, onAdd }) {
  const [tab, setTab] = useState(defaultType || 'sell')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal nsf-modal" onClick={e => e.stopPropagation()}>

        {/* ── THREE MODES TAB HEADER ── */}
        <div className="nsf-tab-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button
            className={`nsf-tab ${tab === 'sell' ? 'nsf-tab-active nsf-tab-sell' : ''}`}
            onClick={() => setTab('sell')}
          >
            <IconUp /> ขายทอง
          </button>
          <button
            className={`nsf-tab ${tab === 'buy' ? 'nsf-tab-active nsf-tab-buy' : ''}`}
            onClick={() => setTab('buy')}
          >
            <IconDown /> รับซื้อทอง
          </button>
          <button
            className={`nsf-tab ${tab === 'discount' ? 'nsf-tab-active nsf-tab-discount' : ''}`}
            onClick={() => setTab('discount')}
            style={tab === 'discount' ? { borderBottomColor: 'var(--blue)', color: 'var(--blue)' } : {}}
          >
            <IconTagMain /> เพิ่มส่วนลด
          </button>
        </div>

        {/* ── ACTIVE TAB VIEW ── */}
        {tab === 'sell' && (
          <NewSaleFormSell
            todayPrice={todayPrice}
            onAdd={onAdd}
            onSaved={onSaved}
            onClose={onClose}
          />
        )}

        {tab === 'buy' && (
          <NewSaleFormBuy
            todayPrice={todayPrice}
            onAdd={onAdd}
            onSaved={onSaved}
            onClose={onClose}
          />
        )}

        {tab === 'discount' && (
          <NewSaleFormDiscount
            todayPrice={todayPrice}
            onAdd={onAdd}
            onSaved={onSaved}
            onClose={onClose}
          />
        )}

      </div>
    </div>
  )
}

function IconUp() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> }
function IconDown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg> }
function IconTagMain() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> }
