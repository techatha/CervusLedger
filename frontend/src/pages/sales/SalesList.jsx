import { useState, useRef } from 'react'
import NewSaleForm from './NewSaleForm'
import './SalesList.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode } from '@fortawesome/free-solid-svg-icons'
import GoldPriceDashboard from '../../components/GoldPriceDashboard'

export default function SalesList() {
  const [showForm, setShowForm] = useState(null) // null | 'sell' | 'buy'
  const [price, setPrice] = useState(null)
  const priceDashboardRef = useRef()

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">ทำรายการขาย</div>
          <div className="page-meta">
            ทำรายการขายทอง และชำระดอกเบี้ย
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowForm('buy')}>
            <IconDown /> รับซื้อทอง
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm('sell')}>
            <IconUp /> ขายทอง
          </button>
        </div>
      </div>

      {/* ── CASHIER TOP SECTION (75% / 25% Split) ── */}
      <div className="cashier-top-section">
        {/* Left Side: 75% Dashboard */}
        <GoldPriceDashboard ref={priceDashboardRef} onPriceLoaded={setPrice} />

        {/* Right Side: 25% PromptPay QR Code */}
        <div className="qr-payment-container">
          <div className="qr-header">
            <span className="qr-title-text">รับชำระเงิน (PromptPay)</span>
          </div>
          <div className="qr-body">
            {/* Placeholder for the actual QR Code component */}
            <div className="qr-placeholder-box">
              <IconThaiQR />
              <span className="qr-hint">สร้างคิวอาร์โค้ดตอนทำรายการ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Form Modal */}
      {showForm && (
        <NewSaleForm
          defaultType={showForm}
          todayPrice={price}
          onSaved={() => { setShowForm(null); priceDashboardRef.current?.refresh() }}
          onClose={() => setShowForm(null)}
        />
      )}
    </div>
  )
}

// ─── Inline SVG / Icon Helpers ───
function IconDown() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg> }
function IconUp() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> }
function IconThaiQR() { return <FontAwesomeIcon icon={faQrcode} size="3x" /> }
