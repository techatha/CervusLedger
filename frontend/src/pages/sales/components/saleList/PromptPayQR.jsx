import generatePayload from 'promptpay-qr'
import { QRCodeCanvas } from 'qrcode.react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode, faMobileButton, faCircleXmark, faCircleCheck, faArrowsRotate } from '@fortawesome/free-solid-svg-icons'

export default function PromptPayQR({
  showQr,
  qrAmount,
  promptpayNumber,
  promptpayName,
  bankName,
  bankAccount,
  displayStatus,
  displayError,
  onRetryQR,
}) {
  return (
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
                  {(bankName || bankAccount) && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      {bankName && `ธนาคาร: ${bankName}`} {bankAccount && `(เลขบัญชี: ${bankAccount})`}
                    </span>
                  )}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {displayStatus === 'sending' && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: '#f1f5f9', color: '#64748b',
                        padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: '500'
                      }}>
                        <FontAwesomeIcon icon={faArrowsRotate} spin /> กำลังส่ง QR ไปที่หน้าจอ...
                      </div>
                    )}
                    {displayStatus === 'done' && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'var(--green-bg)', color: 'var(--green)',
                        padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: '500'
                      }}>
                        <FontAwesomeIcon icon={faMobileButton} />
                        <FontAwesomeIcon icon={faCircleCheck} />
                        ส่ง QR ไปที่หน้าจอสำเร็จ
                      </div>
                    )}
                    {displayStatus === 'error' && (
                      <>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: 'var(--red-bg)', color: 'var(--red)',
                          padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: '500'
                        }}>
                          <FontAwesomeIcon icon={faMobileButton} />
                          <FontAwesomeIcon icon={faCircleXmark} />
                          เชื่อมต่อหน้าจอไม่ได้
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={onRetryQR}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          <FontAwesomeIcon icon={faArrowsRotate} /> ลองเชื่อมต่ออีกครั้ง
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="alert alert-error" style={{ textAlign: 'center', fontSize: '12px', margin: '0 10px', padding: '12px', lineHeight: '1.4', width: '90%' }}>
                ไม่พบข้อมูลหมายเลขพร้อมเพย์ในระบบ กรุณาตรวจสอบการตั้งค่า
              </div>
            )}
          </div>
        ) : (
          <div className="qr-placeholder-box">
            <FontAwesomeIcon icon={faQrcode} size="3x" />
            <span className="qr-hint">เพิ่มรายการเพื่อสร้าง QR Code อัตโนมัติ</span>
          </div>
        )}
      </div>
    </div>
  )
}
