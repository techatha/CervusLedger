import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePawnCache } from '@/context/PawnCacheContext'
import NewSaleForm from './NewSaleForm'
import './SalesList.css'
import GoldPriceDashboard from '@/components/GoldPriceDashboard'
import { CreateSale, GetSetting } from 'wailsjs/go/sale_handler/SaleHandler.js'
import { RecordPayment, AddPrincipalChange, RedeemPawn, RecordPaymentsGrouped } from 'wailsjs/go/pawn_handler/PawnHandler.js'
import { SendQRToDisplay, SendSuccessToDisplay, SendFailToDisplay } from 'wailsjs/go/displayer_handler/DisplayerHandler.js'
import PromptPayQR from './components/saleList/PromptPayQR'
import SalesCart from './components/saleList/SalesCart'

export default function SalesList({ cartItems, setCartItems }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { reloadAll } = usePawnCache()

  const [showForm, setShowForm] = useState(null) // null | 'sell' | 'buy'
  const [price, setPrice] = useState(null)
  const [qrAmount, setQrAmount] = useState(0)
  const [showQr, setShowQr] = useState(false)
  const [savingCart, setSavingCart] = useState(false)
  const [error, setError] = useState(null)
  const [displayStatus, setDisplayStatus] = useState('idle') // idle | sending | done | error
  const [displayError, setDisplayError] = useState(null)
  const [promptpayNumber, setPromptpayNumber] = useState(import.meta.env.VITE_DEFAULT_PROMPTPAY_NUMBER || '')
  const [promptpayName, setPromptpayName] = useState(import.meta.env.VITE_DEFAULT_PROMPTPAY_NAME || '')
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')

  const priceDashboardRef = useRef()
  const processedStateRef = useRef(null)

  // Example modification inside the main transaction table calculator
  const mainTotalAmount = cartItems.reduce((acc, item) => {
    if (item.type === 'sell' || item.type === 'pawn_interest' || (item.type === 'pawn_principal_change' && item.change_type === 'reduction') || item.type === 'addition') {
      return acc + item.total_amount;
    } else if (item.type === 'buy' || item.type === 'discount' || (item.type === 'pawn_principal_change' && item.change_type === 'increase')) {
      return acc - item.total_amount; // Subtracts buybacks and active discounts from total customer payment due
    }
    return acc;
  }, 0);

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
    GetSetting('bank_name')
      .then(val => {
        if (val) setBankName(val)
      })
      .catch(err => {
        console.error('Failed to load bank_name settings:', err)
      })
    GetSetting('bank_account')
      .then(val => {
        if (val) setBankAccount(val)
      })
      .catch(err => {
        console.error('Failed to load bank_account settings:', err)
      })
  }, [])

  const handleSendQR = () => {
    if (promptpayNumber && mainTotalAmount > 0) {
      setDisplayStatus('sending')
      setDisplayError(null)
      SendQRToDisplay(promptpayNumber, Number(mainTotalAmount))
        .then(() => setDisplayStatus('done'))
        .catch(err => {
          console.error('Failed to send QR to display:', err)
          setDisplayStatus('error')
          setDisplayError(err.message || String(err))
        })
    }
  }

  // Auto-generate QR code when cart items or total amount changes
  useEffect(() => {
    if (cartItems.length > 0 && mainTotalAmount > 0) {
      setQrAmount(mainTotalAmount)
      setShowQr(true)
      handleSendQR()
    } else {
      setShowQr(false)
      setQrAmount(0)
    }
    // We intentionally don't want to re-run on every state change unless cart or total or promptpay changes
  }, [cartItems, mainTotalAmount, promptpayNumber])


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

  const handleClearCart = async () => {
    setCartItems([])
    setQrAmount(0)
    setShowQr(false)
    setDisplayStatus('idle')
    setDisplayError(null)
    try {
      await SendFailToDisplay()
    } catch (err) {
      console.error('Failed to send fail to display:', err)
    }
  }

  const handleSaveAllSales = async () => {
    setSavingCart(true)
    setError(null)
    try {
      const mergedCart = []
      const revenueStack = [] // เปลี่ยนชื่อเป็น revenueStack ให้ชัดเจนว่ารับเฉพาะรายรับ

      // ── ALGORITHM: REVENUE-ONLY CASCADING DISCOUNT ──
      for (const item of cartItems) {
        const currentItem = { ...item } // Clone state

        // 1. ถ้ารายการเป็น "รายรับ" (ขายทอง หรือ รับดอกเบี้ย หรือ ลดต้นจำนำ) ให้ Push ลง Stack
        if (currentItem.type === 'sell' || currentItem.type === 'pawn_interest' || (currentItem.type === 'pawn_principal_change' && currentItem.change_type === 'reduction')) {
          revenueStack.push(currentItem)
        }
        // 2. ถ้ารายการเป็น "รับซื้อ (Buy)" หรือ "เพิ่มต้นจำนำ" มันคือรายจ่าย ให้ข้าม Stack และบันทึกตรงๆ
        else if (currentItem.type === 'buy' || (currentItem.type === 'pawn_principal_change' && currentItem.change_type === 'increase')) {
          mergedCart.push(currentItem)
        }
        // 3. ถ้ารายการเป็น "เพิ่มเงิน (Addition)"
        else if (currentItem.type === 'addition') {
          let remainingAddition = currentItem.total_amount
          const additionRefText = currentItem.label || 'เพิ่มเงิน'

          if (revenueStack.length > 0) {
            const topItem = revenueStack.pop()
            topItem.total_amount += remainingAddition
            topItem.notes = topItem.notes
              ? `${topItem.notes} | รวม(${additionRefText}: ${remainingAddition}บ.)`
              : `รวม(${additionRefText}: ${remainingAddition}บ.)`
            
            remainingAddition = 0
            revenueStack.push(topItem)
          }

          if (remainingAddition > 0) {
            revenueStack.push(currentItem)
          }
        }
        // 4. ถ้ารายการเป็น "ส่วนลด (Discount)"
        else if (currentItem.type === 'discount') {
          let remainingDiscount = currentItem.total_amount
          const discountRefText = currentItem.label || 'ส่วนลด'

          // วนลูปหักส่วนลดจาก "รายรับ" ใน Stack จนกว่าส่วนลดจะหมด หรือ Stack ว่าง
          while (remainingDiscount > 0 && revenueStack.length > 0) {
            const topItem = revenueStack.pop() // ดึงรายรับล่าสุดออกมา

            if (topItem.total_amount >= remainingDiscount) {
              // ยอดรายรับ มากกว่า/เท่ากับ ส่วนลด -> หักแล้วดันกลับเข้า Stack
              topItem.total_amount -= remainingDiscount

              topItem.notes = topItem.notes
                ? `${topItem.notes} | หัก(${discountRefText}: ${remainingDiscount}บ.)`
                : `หัก(${discountRefText}: ${remainingDiscount}บ.)`

              remainingDiscount = 0
              revenueStack.push(topItem)
            } else {
              // ส่วนลด มากกว่า ยอดรายรับ -> หักจนรายรับเหลือ 0 แล้วดึงรายการต่อไปมาหักต่อ
              const applied = topItem.total_amount
              remainingDiscount -= applied

              topItem.notes = topItem.notes
                ? `${topItem.notes} | หัก(${discountRefText}: ${applied}บ.)`
                : `หัก(${discountRefText}: ${applied}บ.)`

              topItem.total_amount = 0
              mergedCart.push(topItem) // ยอดเป็น 0 ส่งเข้าผลลัพธ์สุดท้าย
            }
          }

          // 5. ถ้าหักรายรับจนหมดแล้วยังมี "ส่วนลดเหลือ" (หรือไม่มีการขายเลย มีแต่รับซื้อ)
          // ให้บันทึกส่วนลดก้อนนี้เป็น "Expense (รายจ่าย) 1 ก้อนแยกต่างหาก"
          if (remainingDiscount > 0) {
            mergedCart.push({
              ...currentItem,
              total_amount: remainingDiscount, // บันทึกเฉพาะส่วนลดที่เหลือ
              notes: currentItem.notes
                ? `${currentItem.notes} [ส่วนลดเกินยอดขาย: บันทึกเป็นรายจ่าย]`
                : '[ส่วนลดเกินยอดขาย: บันทึกเป็นรายจ่าย]'
            })
          }
        }
      }

      // 5. เทรายการรายรับที่เหลือ (ยอดสุทธิหลังหักส่วนลด) ใน Stack ทั้งหมดรวมเข้า Final Result
      mergedCart.push(...revenueStack)

      // ── SAVE TO BACKEND ──
      for (const item of mergedCart) {
        if (item.type === 'pawn_interest') {
          const paymentsToProcess = item.payments || [item]
          let remainingTotal = item.total_amount
          const inputs = []

          for (const p of paymentsToProcess) {
            const alloc = Math.min(p.interest_amount, remainingTotal)
            
            inputs.push({
              pawn_record_id: p.pawn_record_id,
              month: p.month,
              year: p.year,
              paid_date: p.paid_date,
              notes: p.notes,
              interest_amount: alloc,
              customer_name: p.customer_name,
              ticket_number: p.ticket_number,
            })
            
            remainingTotal -= alloc
            if (remainingTotal < 0) remainingTotal = 0
          }
          
          await RecordPaymentsGrouped(inputs, item.total_amount, item.notes)
        } else if (item.type === 'pawn_principal_change') {
          const { label, total_amount, price_per_baht, weight_baht, type, original_notes, cart_notes, ...cleanInput } = item
          cleanInput.notes = original_notes || ''
          if (!cleanInput.date) {
            cleanInput.date = new Date().toLocaleDateString('sv')
          }
          await AddPrincipalChange(cleanInput)
          
          if (cleanInput.change_type === 'reduction' && cleanInput.new_principal === 0) {
            await RedeemPawn(cleanInput.pawn_record_id, cleanInput.date)
          }
        } else {
          // ถอด label ออกก่อนส่งให้ Backend
          const { label, ...cleanInput } = item
          await CreateSale({ ...cleanInput, date: new Date().toISOString() })
        }
      }

      if (showQr) {
        try {
          await SendSuccessToDisplay()
        } catch (displayErr) {
          console.error('Failed to send success to display:', displayErr)
        }
      }

      setCartItems([])
      setQrAmount(0)
      setShowQr(false)
      priceDashboardRef.current?.refresh()
      reloadAll()
      // alert('บันทึกรายการสำเร็จเรียบร้อยแล้ว')
    } catch (e) {
      setError('บันทึกรายการไม่สำเร็จ: ' + e)
    } finally {
      setSavingCart(false)
    }
  }

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">ทำรายการ ซื้อ-ขาย</div>
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
            onClearCart={handleClearCart}
            onSaveAllSales={handleSaveAllSales}
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
          bankName={bankName}
          bankAccount={bankAccount}
          savingCart={savingCart}
          displayStatus={displayStatus}
          displayError={displayError}
          onRetryQR={handleSendQR}
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
