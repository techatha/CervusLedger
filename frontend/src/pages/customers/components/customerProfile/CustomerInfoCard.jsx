import { useState } from 'react'
import { toBE } from '../../../../utils/thai'

export default function CustomerInfoCard({ customer }) {
  return (
    <div className="card cp-info-card" style={{ flex: 1 }}>
      <div className="card-header">
        <span className="card-title">ข้อมูลส่วนตัว</span>
        <span className="page-meta">(รหัสลูกค้า #{customer.id})</span>
      </div>
      <div className="cp-fields">
        <InfoRow label="ชื่อ-นามสกุล" value={[customer.prefix, customer.firstname, customer.lastname].join(' ')} />
        <InfoRow label="เบอร์โทร" value={customer.phone} mono />
        <InfoRow
          label="เลขบัตรประชาชน"
          value={customer.id_card || null}
          render={v => <MaskedIdCard idCard={v} />}
        />
        <InfoRow label="วันที่เพิ่ม" value={toBE(customer.created_at)} />
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, render }) {
  const display = value || null
  return (
    <div className="cp-info-row">
      <span className="cp-info-label">{label}</span>
      <span className={`cp-info-value ${mono ? 'cp-mono' : ''}`}>
        {display
          ? (render ? render(display) : display)
          : <span className="cp-empty">—</span>}
      </span>
    </div>
  )
}

function MaskedIdCard({ idCard }) {
  const [revealed, setRevealed] = useState(false)

  // Create the masked version (e.g., "1xxxxxxxxxxx9")
  const masked = idCard.length > 2
    ? `${idCard.slice(0, 1)}${'x'.repeat(idCard.length - 2)}${idCard.slice(-1)}`
    : 'xxx'

  return (
    <span
      className={`cp-id-card ${!revealed ? 'cp-id-masked' : ''}`}
      onClick={() => setRevealed(!revealed)}
      title={revealed ? "คลิกเพื่อซ่อน" : "คลิกเพื่อดู"}
    >
      {revealed ? idCard : masked}
    </span>
  )
}
