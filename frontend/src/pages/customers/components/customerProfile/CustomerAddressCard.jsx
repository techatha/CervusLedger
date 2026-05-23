export default function CustomerAddressCard({ customer }) {
  return (
    <div className="card cp-info-card" style={{ flex: 1 }}>
      <div className="card-header">
        <span className="card-title">ที่อยู่</span>
      </div>
      <div className="cp-fields">
        {/* Combined House No. and Moo */}
        <InfoRow
          label="บ้านเลขที่"
          value={
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%' }}>
              {/* Left Half (50%): House Number */}
              <div>
                {customer.address_no || <span className="cp-empty">—</span>}
              </div>

              {/* Right Half (50%): Moo Label & Value */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="cp-info-label" style={{ minWidth: 'auto', padding: 0 }}>หมู่</span>
                <span>{customer.moo || <span className="cp-empty">—</span>}</span>
              </div>
            </div>
          }
        /> 
        <InfoRow label="ที่อยู่เพิ่ม" value={customer.address_line} />
        <InfoRow label="ถนน" value={customer.road} />
        <InfoRow label="ตำบล/แขวง" value={customer.tambon} />
        <InfoRow label="อำเภอ/เขต" value={customer.amphoe} />
        <InfoRow label="จังหวัด" value={customer.province} />
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  const display = value || null
  return (
    <div className="cp-info-row">
      <span className="cp-info-label">{label}</span>
      <span className="cp-info-value">
        {display || <span className="cp-empty">—</span>}
      </span>
    </div>
  )
}
