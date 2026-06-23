import generatePayload from 'promptpay-qr'
import { QRCodeCanvas } from 'qrcode.react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode } from '@fortawesome/free-solid-svg-icons'

export default function PromptPayQR({
  showQr,
  qrAmount,
  promptpayNumber,
  promptpayName,
  savingCart,
  onCloseQr,
  onSaveAllSales,
  displayStatus,
  displayError,
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
                  {displayStatus === 'sending' && (
                    <div className="alert alert-warning" style={{ fontSize: '11px', padding: '8px', margin: '8px auto 0 auto', width: '90%', textAlign: 'center' }}>
                      กำลังส่ง QR ไปที่หน้าจอ...
                    </div>
                  )}
                  {displayStatus === 'done' && (
                    <div className="alert alert-success" style={{ fontSize: '11px', padding: '8px', margin: '8px auto 0 auto', width: '90%', textAlign: 'center', color: '#155724', backgroundColor: '#d4edda', borderColor: '#c3e6cb' }}>
                      ส่ง QR ไปที่หน้าจอสำเร็จ
                    </div>
                  )}
                  {displayStatus === 'error' && (
                    <div className="alert alert-error" style={{ fontSize: '11px', padding: '8px', margin: '8px auto 0 auto', width: '90%', textAlign: 'center' }}>
                      หน้าจอ: {displayError}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="alert alert-error" style={{ textAlign: 'center', fontSize: '12px', margin: '0 10px', padding: '12px', lineHeight: '1.4', width: '90%' }}>
                ไม่พบข้อมูลหมายเลขพร้อมเพย์ในระบบ กรุณาตรวจสอบการตั้งค่า
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onCloseQr} style={{ fontSize: '11px', padding: '4px 10px', marginTop: '4px' }}>
              ปิด QR Code
            </button>
            <button className="btn btn-primary" onClick={onSaveAllSales} disabled={savingCart}>
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
  )
}
