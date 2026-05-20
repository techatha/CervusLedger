import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NewSaleForm from './NewSaleForm'
import './SalesList.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode, faFileCirclePlus, faTag } from '@fortawesome/free-solid-svg-icons'
import { faTrashCan } from '@fortawesome/free-regular-svg-icons'
import GoldPriceDashboard from '../../components/GoldPriceDashboard'
import { CreateSale, GetSetting } from '../../../wailsjs/go/handlers/SaleHandler.js'
import { RecordPayment } from '../../../wailsjs/go/handlers/PawnHandler.js'
import generatePayload from 'promptpay-qr'
import { QRCodeCanvas } from 'qrcode.react'

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
          <div className="sales-cart-container">
            <div className="sales-cart-header">
              <span className="sales-cart-title">รายการขาย</span>
              <span className="badge badge-gold" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                {cartItems.length} รายการ
              </span>
            </div>
            <div className="sales-cart-body">
              {cartItems.length === 0 ? (
                <div className="empty-cart-state">
                  <div className="empty-cart-icon">🛒</div>
                  <div style={{ fontWeight: 'bold' }}>ยังไม่มีรายการขาย</div>
                </div>
              ) : (
                <table className="sales-cart-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ประเภท</th>
                      <th className="col-200">รายละเอียด</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>น้ำหนัก</th>
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
                            item.type === 'buy' ? 'badge-amber' :
                              item.type === 'discount' ? 'badge-red' : 'badge-purple'
                            }`} style={{ fontSize: '11px' }}>
                            {item.type === 'sell' ? 'ขาย' :
                              item.type === 'buy' ? 'รับซื้อ' :
                                item.type === 'discount' ? 'ส่วนลด' : 'ดอกเบี้ย'}
                          </span>
                        </td>

                        {/* ── Label & Sub-Notes Column ── */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                              {item.label}
                            </span>

                            {/* Render the small gray note if notes exists in data */}
                            {item.notes && (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                          {item.type === 'pawn_interest' || item.type === 'discount' ? '—' : item.weight_baht.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 4 }) + ' กรัม'}
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {item.type === 'pawn_interest' || item.type === 'discount' ? '—' : item.price_per_baht.toLocaleString('th-TH')}
                        </td>
                        <td style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 'bold',
                          color: item.type === 'sell' ? 'var(--green)' :
                            item.type === 'buy' ? 'var(--red)' :
                              item.type === 'discount' ? 'var(--red)' : 'var(--blue)'
                        }}>
                          {item.type === 'discount' ? '-' : ''} {item.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
              <div className="sales-cart-add-wrapper">
                <button
                  className="btn btn-ghost btn-add-item"
                  onClick={() => setShowForm('sell')}>
                  <FontAwesomeIcon icon={faFileCirclePlus} /> เพิ่มรายการ
                </button>
                <button
                  className="btn btn-ghost btn-discount-item"
                  onClick={() => setShowForm('discount')}
                >
                  <FontAwesomeIcon icon={faTag} /> เพิ่มส่วนลด
                </button>
              </div>
            </div>
            {cartItems.length > 0 && (
              <div className="sales-cart-footer">
                <div className="sales-cart-total-row">
                  <span className="total-label">ยอดรวมสุทธิ:</span>
                  <span className="total-val">
                    {mainTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
                <div className="sales-cart-actions">
                  <button className="btn btn-ghost" onClick={() => { setCartItems([]); setQrAmount(0); setShowQr(false); }} disabled={savingCart}>
                    <FontAwesomeIcon icon={faTrashCan} /> ล้างตะกร้า
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                    onClick={handleGenerateQR}
                    disabled={savingCart}
                  >
                    <FontAwesomeIcon icon={faQrcode} /> สร้าง QR Code
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
            {showQr ? (
              <div className="qr-active-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
                {qrAmount <= 0 ? (
                  <div className="alert alert-warning" style={{ textAlign: 'center', fontSize: '13px', margin: '0 10px', padding: '16px', lineHeight: '1.5', width: '90%', borderRadius: '8px' }}>
                    ยอดชำระเป็นศูนย์หรือติดลบ ไม่สามารถสร้าง QR Code ได้
                  </div>
                ) : promptpayNumber ? (
                  <>
                    {/* ─── OFFLINE LOCAL QR CODE ─── */}
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
                      <QRCodeCanvas
                        value={generatePayload(promptpayNumber, { amount: qrAmount })}
                        size={180}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"M"}
                      />
                    </div>

                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <span className="qr-amount-text" style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                        ยอดชำระ: {qrAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Scan QR Code เพื่อโอนเงิน
                      </span>
                      {promptpayName && (
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                          ชื่อบัญชี: {promptpayName}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="alert alert-error" style={{ textAlign: 'center', fontSize: '12px', margin: '0 10px', padding: '12px', lineHeight: '1.4', width: '90%' }}>
                    ไม่พบข้อมูลหมายเลขพร้อมเพย์ในระบบ กรุณาตรวจสอบไฟล์ .env หรือการตั้งค่า
                  </div>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => { setQrAmount(0); setShowQr(false); }} style={{ fontSize: '11px', padding: '4px 10px', marginTop: '4px' }}>
                  ปิด QR Code
                </button>
                <button className="btn btn-primary" onClick={handleSaveAllSales} disabled={savingCart}>
                  {savingCart ? 'กำลังบันทึกรายการ...' : 'ยืนยันจ่ายเงินสำเร็จ'}
                </button>
              </div>
            ) : (
              <div className="qr-placeholder-box">
                <FontAwesomeIcon icon={faQrcode} size="3x" />
                <span className="qr-hint">คิวอาร์โค้ดจะแสดงขึ้นเมื่อกดปุ่ม สร้าง QR Code</span>
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
