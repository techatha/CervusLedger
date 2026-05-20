import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NewSaleForm from './NewSaleForm'
import './SalesList.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode, faFileCirclePlus } from '@fortawesome/free-solid-svg-icons'
import { faTrashCan } from '@fortawesome/free-regular-svg-icons'
import GoldPriceDashboard from '../../components/GoldPriceDashboard'
import { CreateSale, GetSetting } from '../../../wailsjs/go/handlers/SaleHandler.js'
import { RecordPayment } from '../../../wailsjs/go/handlers/PawnHandler.js'

export default function SalesList() {
  const location = useLocation()
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(null) // null | 'sell' | 'buy'
  const [price, setPrice] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [qrAmount, setQrAmount] = useState(0)
  const [savingCart, setSavingCart] = useState(false)
  const [error, setError] = useState(null)
  const [promptpayNumber, setPromptpayNumber] = useState(import.meta.env.VITE_DEFAULT_PROMPTPAY_NUMBER || '')

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
    setQrAmount(cartTotal)
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
      priceDashboardRef.current?.refresh()
      alert('บันทึกรายการขายสำเร็จเรียบร้อยแล้ว')
    } catch (e) {
      setError('บันทึกรายการไม่สำเร็จ: ' + e)
    } finally {
      setSavingCart(false)
    }
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.total_amount, 0)

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
          <div className="sales-cart-container">
            <div className="sales-cart-header">
              <span className="sales-cart-title">รายการขายในตะกร้า</span>
              <span className="badge badge-gold" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                {cartItems.length} รายการ
              </span>
            </div>
            <div className="sales-cart-body">
              {cartItems.length === 0 ? (
                <div className="empty-cart-state">
                  <div className="empty-cart-icon">🛒</div>
                  <div style={{ fontWeight: 'bold' }}>ยังไม่มีรายการขาย</div>
                  <button className="btn btn-primary" onClick={() => setShowForm('sell')}>
                  <FontAwesomeIcon icon={faFileCirclePlus} /> เพิ่มรายการ
                  </button>
                </div>
              ) : (
                <table className="sales-cart-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ประเภท</th>
                      <th>รายละเอียด</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>น้ำหนัก (บาท)</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>ราคา/บาท</th>
                      <th style={{ textAlign: 'right', width: '140px' }}>ยอดรวม</th>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`badge ${item.type === 'sell' ? 'badge-green' :
                              item.type === 'buy' ? 'badge-amber' : 'badge-blue'
                            }`} style={{ fontSize: '11px' }}>
                            {item.type === 'sell' ? 'ขาย' :
                              item.type === 'buy' ? 'รับซื้อ' : 'ดอกเบี้ย'}
                          </span>
                        </td>
                        <td style={{ fontWeight: '500' }}>{item.label}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                          {item.type === 'pawn_interest' ? '—' : item.weight_baht.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {item.type === 'pawn_interest' ? '—' : item.price_per_baht.toLocaleString('th-TH')}
                        </td>
                        <td style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 'bold',
                          color: item.type === 'sell' ? 'var(--green)' :
                            item.type === 'buy' ? 'var(--red)' : 'var(--blue)'
                        }}>
                          {item.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteCartItem(idx)}
                            title="ลบรายการ"
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '15px' }}
                          >
                            <FontAwesomeIcon icon={faTrashCan} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="sales-cart-footer">
                <div className="sales-cart-total-row">
                  <span className="total-label">ยอดรวมสุทธิ:</span>
                  <span className="total-val">
                    {cartTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
                <div className="sales-cart-actions">
                  <button className="btn btn-ghost" onClick={() => { setCartItems([]); setQrAmount(0); }} disabled={savingCart}>
                    ล้างตะกร้า
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                    onClick={handleGenerateQR}
                    disabled={savingCart}
                  >
                    สร้าง QR Code
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveAllSales} disabled={savingCart}>
                    {savingCart ? 'กำลังบันทึก...' : 'ยืนยันและบันทึกรายการ'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gold Price Dashboard (Adjustable to 100% width of parent 70% container) */}
          <GoldPriceDashboard ref={priceDashboardRef} onPriceLoaded={setPrice} />
        </div>

        {/* Right Side: 30% PromptPay QR Code */}
        <div className="qr-payment-container">
          <div className="qr-header">
            <span className="qr-title-text">รับชำระเงิน (PromptPay)</span>
          </div>
          <div className="qr-body">
            {qrAmount > 0 ? (
              <div className="qr-active-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
                {promptpayNumber ? (
                  <>
                    <img
                      src={`https://promptpay.io/${promptpayNumber}/${qrAmount}.png`}
                      alt="PromptPay QR Code"
                      style={{ width: '190px', height: '190px', border: '6px solid #fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <span className="qr-amount-text" style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                        ยอดชำระ: {qrAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Scan QR Code เพื่อโอนเงิน
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="alert alert-error" style={{ textAlign: 'center', fontSize: '12px', margin: '0 10px', padding: '12px', lineHeight: '1.4', width: '90%' }}>
                    ไม่พบข้อมูลหมายเลขพร้อมเพย์ในระบบ กรุณาตรวจสอบไฟล์ .env หรือการตั้งค่า
                  </div>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setQrAmount(0)} style={{ fontSize: '11px', padding: '4px 10px', marginTop: '4px' }}>
                  ปิด QR Code
                </button>
              </div>
            ) : (
              <div className="qr-placeholder-box">
                <FontAwesomeIcon icon={faQrcode} size="3x" />
                <span className="qr-hint">สร้างคิวอาร์โค้ดตอนทำรายการ</span>
              </div>
            )}
          </div>
        </div>
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
