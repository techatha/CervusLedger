import { toBE, formatBaht } from '@/utils/thai'

export default function CustomerGoldPurchasesCard({ purchases }) {
  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div className="card-header">
        <span className="card-title">ประวัติการรับซื้อทองคำ (รับซื้อของเก่า)</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>วันที่รับซื้อ</th>
              <th>ประเภททอง</th>
              <th>รุ่น/ขนาด (Sub-type)</th>
              <th style={{ textAlign: 'right' }}>น้ำหนัก (กรัม)</th>
              <th style={{ textAlign: 'right' }}>ยอดราคารวม</th>
              <th style={{ textAlign: 'center' }}>การเข้าคลัง</th>
              <th style={{ textAlign: 'center' }}>สถานะของทอง</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr className="loading-row">
                <td colSpan={8}>ยังไม่มีประวัติการรับซื้อทองคำ</td>
              </tr>
            ) : (
              purchases.map(pur => (
                <tr key={pur.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{toBE(pur.date)}</td>
                  <td>
                    <span className="badge badge-gold" style={{ fontSize: '12px' }}>
                      {pur.type || pur.item_type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {pur.subtype || pur.item_subtype || '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold' }}>
                    {pur.weight_grams != null 
                      ? pur.weight_grams.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                      : ((pur.weight_baht || 0) * 15.244).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 'bold', color: 'var(--red)' }}>
                    {formatBaht(pur.total_amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {pur.is_inventory === 1 ? (
                      <span className="badge badge-purple" style={{ fontSize: '11px' }}>นำเข้าคลัง</span>
                    ) : (
                      <span className="badge badge-muted" style={{ fontSize: '11px', opacity: 0.6 }}>ไม่เข้าคลัง</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${pur.still_exists === 1 ? 'badge-green' : 'badge-muted'}`} style={{ fontSize: '11px' }}>
                      {pur.still_exists === 1 ? 'มีของในร้าน' : 'ขาย/ละลายแล้ว'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {pur.notes || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
