import { useState } from 'react'
import { ReadSmartCard } from 'wailsjs/go/smartcard_handler/SmartCardHandler'
import './SmartCardTest.css'

export default function SmartCardTest() {
  const [status,  setStatus]  = useState('idle') // idle | reading | success | error
  const [result,  setResult]  = useState(null)
  const [errMsg,  setErrMsg]  = useState('')

  const handleRead = async () => {
    setStatus('reading')
    setResult(null)
    setErrMsg('')
    try {
      const card = await ReadSmartCard()
      console.log(card)
      setResult(card)
      setStatus('success')
    } catch (e) {
      setErrMsg(String(e))
      setStatus('error')
    }
  }

  const fullName = result
    ? [result.prefix, result.firstname, result.lastname].filter(Boolean).join(' ')
    : ''

  return (
    <div className="page-view">
      <div className="page-header">
        <div>
          <div className="page-title">ทดสอบเครื่องอ่านบัตร</div>
          <div className="page-meta">IDENTIV SCR-2700R · go-pcsclite</div>
        </div>
      </div>

      <div className="sct-card card">
        {/* Reader graphic */}
        <div className="sct-reader-graphic">
          <div className={`sct-reader-icon ${status === 'reading' ? 'sct-reading' : ''}`}>
            <IconCard />
          </div>
          <div className="sct-reader-label">
            {status === 'idle'    && 'พร้อมอ่านบัตร'}
            {status === 'reading' && 'กำลังอ่านบัตร...'}
            {status === 'success' && 'อ่านบัตรสำเร็จ ✓'}
            {status === 'error'   && 'อ่านบัตรไม่สำเร็จ'}
          </div>
        </div>

        {/* Action */}
        <div className="sct-actions">
          <button
            className="btn btn-primary"
            onClick={handleRead}
            disabled={status === 'reading'}
            style={{ minWidth:160 }}
          >
            {status === 'reading' ? (
              <><span className="sct-spinner" /> กำลังอ่าน...</>
            ) : (
              <><IconCardRead /> อ่านบัตร</>
            )}
          </button>
        </div>

        {/* Error */}
        {status === 'error' && (
          <div className="alert alert-error" style={{ margin:'0 24px' }}>
            {errMsg}
            <div style={{ marginTop:6, fontSize:12, opacity:0.8 }}>
              ตรวจสอบ: เสียบเครื่องอ่านบัตร · ใส่บัตรในช่อง · ติดตั้ง pcsc-lite (macOS: brew install pcsc-lite)
            </div>
          </div>
        )}

        {/* Result */}
        {status === 'success' && result && (
          <div className="sct-result">
            <div className="sct-result-header">ข้อมูลจากบัตร</div>
            <div className="sct-result-grid">
              <ResultRow label="ชื่อ-นามสกุล"     value={fullName} />
              <ResultRow label="เลขบัตรประชาชน"   value={result.id_card} mono />
              <ResultRow label="บ้านเลขที่"        value={result.address_no} />
              <ResultRow label="ที่อยู่เพิ่มเติม"    value={result.address_line} />
              <ResultRow label="หมู่"              value={result.moo} />
              <ResultRow label="ถนน"               value={result.road} />
              <ResultRow label="ตำบล/แขวง"        value={result.tambon} />
              <ResultRow label="อำเภอ/เขต"        value={result.amphoe} />
              <ResultRow label="จังหวัด"           value={result.province} />
            </div>
            <div style={{ padding:'12px 20px', fontSize:12, color:'var(--text-muted)' }}>
              ข้อมูลนี้จะถูกกรอกอัตโนมัติเมื่อกด "อ่านบัตร" ในฟอร์มเพิ่มลูกค้า
            </div>
          </div>
        )}
      </div>

      {/* Setup instructions */}
      <div className="card sct-setup">
        <div className="card-header"><span className="card-title">การติดตั้ง</span></div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <SetupStep n={1} label="ติดตั้ง dependency">
            <code className="sct-code">go get github.com/ebfe/scard</code>
          </SetupStep>
          <SetupStep n={2} label="ติดตั้ง pcsc-lite (macOS)">
            <code className="sct-code">brew install pcsc-lite</code>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
              Windows: ใช้ WinSCard ที่มีในระบบอยู่แล้ว ไม่ต้องติดตั้งเพิ่ม
            </div>
          </SetupStep>
          <SetupStep n={3} label="เสียบเครื่องอ่านบัตร IDENTIV SCR-2700R">
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              รอให้ระบบตรวจพบอุปกรณ์ (ไฟ LED สีเขียว) แล้วใส่บัตรประชาชน
            </div>
          </SetupStep>
          <SetupStep n={4} label="กด 'อ่านบัตร' ด้านบน">
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              ข้อมูลจะปรากฏในส่วน 'ข้อมูลจากบัตร' และถูกกรอกอัตโนมัติในฟอร์มลูกค้า
            </div>
          </SetupStep>
        </div>
      </div>
    </div>
  )
}

function ResultRow({ label, value, mono }) {
  return (
    <div className="sct-result-row">
      <span className="sct-result-label">{label}</span>
      <span className={`sct-result-value ${mono ? 'sct-mono' : ''}`}>
        {value || <span style={{ color:'var(--text-disabled)' }}>—</span>}
      </span>
    </div>
  )
}

function SetupStep({ n, label, children }) {
  return (
    <div className="sct-step">
      <div className="sct-step-num">{n}</div>
      <div className="sct-step-body">
        <div className="sct-step-label">{label}</div>
        {children}
      </div>
    </div>
  )
}

function IconCard()    { return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
function IconCardRead(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
