import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NewSaleForm from './NewSaleForm'
import './SalesList.css'
import GoldPriceDashboard from '@/components/GoldPriceDashboard'
import { CreateSale, GetSetting } from 'wailsjs/go/handlers/SaleHandler.js'
import { RecordPayment } from 'wailsjs/go/handlers/PawnHandler.js'
import PromptPayQR from './components/saleList/PromptPayQR'
import SalesCart from './components/saleList/SalesCart'

export default function SalesList() {
  const location = useLocation()
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(null) // null | 'sell' | 'buy'
  const [price, setPrice] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [qrAmount, setQrAmount] = useState(0)
  const [showQr, setShowQr] = useState(false)
  const [savingCart, setSavingCart] = useState(false)
  const [error, setError] = useState(null)
  const [promptpayNumber, setPromptpayNumber] = useState(import.meta.env.VITE_DEFAULT_PROMPTPAY_NUMBER || '')
  const [promptpayName, setPromptpayName] = useState(import.meta.env.VITE_DEFAULT_PROMPTPAY_NAME || '')

  const priceDashboardRef = useRef()
  const processedStateRef = useRef(null)

  useEffect(() => {
    GetSetting('promptpay_number')
      .then(val => {
        if (val) setPromptpayNumber(val)
      })
      .catch(err => {
        console.error('Failed to load promptpay_number settings:', err)
      })
    GetSetting('promptpay_name')
      .then(val => {
        if (val) setPromptpayName(val)
      })
      .catch(err => {
        console.error('Failed to load promptpay_name settings:', err)
      })
  }, [])


  useEffect(() => {
    if (location.state?.addItems && location.state !== processedStateRef.current) {
      processedStateRef.current = location.state
      setCartItems(prev => [...prev, ...location.state.addItems])
      // Clear location state immediately so reload doesn't duplicate
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const handleAddCartItem = (item) => {
    setCartItems(prev => [...prev, item])
    setShowForm(null)
  }

  const handleDeleteCartItem = (idx) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleGenerateQR = () => {
    setQrAmount(mainTotalAmount)
    setShowQr(true)
  }

  const handleSaveAllSales = async () => {
    setSavingCart(true)
    setError(null)
    try {
      for (const item of cartItems) {
        if (item.type === 'pawn_interest') {
          await RecordPayment({
            pawn_record_id: item.pawn_record_id,
            month: item.month,
            year: item.year,
            paid_date: item.paid_date,
            notes: item.notes,
            interest_amount: item.interest_amount,
            customer_name: item.customer_name,
            ticket_number: item.ticket_number,
          })
        } else {
          // Strip the display label from payload before sending to backend
          const { label, ...cleanInput } = item
          await CreateSale(cleanInput)
        }
      }
      setCartItems([])
      setQrAmount(0)
      setShowQr(false)
      priceDashboardRef.current?.refresh()
      alert('บันทึกรายการขายสำเร็จเรียบร้อยแล้ว')
    } catch (e) {
      setError('บันทึกรายการไม่สำเร็จ: ' + e)
    } finally {
      setSavingCart(false)
    }
  }

  // Example modification inside the main transaction table calculator
  const mainTotalAmount = cartItems.reduce((acc, item) => {
    if (item.type === 'sell' || item.type === 'pawn_interest') {
      return acc + item.total_amount;
    } else if (item.type === 'buy' || item.type === 'discount') {
      return acc - item.total_amount; // Subtracts buybacks and active discounts from total customer payment due
    }
    return acc;
  }, 0);

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
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* ── CASHIER CONTAINER WITH 70% / 30% SPLIT ── */}
      <div className="cashier-top-section">
        {/* Left Side: 70% Columns */}
        <div className="cashier-left-col">
          {/* Sales Cart Card */}
          <SalesCart
            cartItems={cartItems}
            onDeleteItem={handleDeleteCartItem}
            onShowForm={setShowForm}
            mainTotalAmount={mainTotalAmount}
            onClearCart={() => { setCartItems([]); setQrAmount(0); setShowQr(false); }}
            onGenerateQR={handleGenerateQR}
            savingCart={savingCart}
          />

          {/* Gold Price Dashboard (Adjustable to 100% width of parent 70% container) */}
          <GoldPriceDashboard ref={priceDashboardRef} onPriceLoaded={setPrice} />
        </div>
        {/* Right Side: 30% PromptPay QR Code */}
        <PromptPayQR
          showQr={showQr}
          qrAmount={qrAmount}
          promptpayNumber={promptpayNumber}
          promptpayName={promptpayName}
          savingCart={savingCart}
          onCloseQr={() => { setQrAmount(0); setShowQr(false); }}
          onSaveAllSales={handleSaveAllSales}
        />
      </div>

      {/* Checkout Form Modal */}
      {showForm && (
        <NewSaleForm
          defaultType={showForm}
          todayPrice={price}
          onAdd={handleAddCartItem}
          onClose={() => setShowForm(null)}
        />
      )}
    </div>
  )
}
