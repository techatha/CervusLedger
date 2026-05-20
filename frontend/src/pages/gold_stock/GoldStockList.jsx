import { useState, useEffect, useCallback } from 'react'
import {
  ListGoldItems,
  DeleteGoldItem,
} from '../../../wailsjs/go/handlers/GoldItemHandler'
import { toBE } from '../../utils/thai'
import GoldStockForm from './GoldStockForm'
import './GoldStockList.css'

const STATUS_TABS = [
  { value: '',            label: 'ทั้งหมด'  },
  { value: 'available',  label: 'มีอยู่'   },
  { value: 'sold',       label: 'ขายแล้ว' },
]

const PURITY_COLOR = {
  '96.5%': 'badge-amber',
  '99.99%': 'badge-gold',
  '99.9%':  'badge-gold',
}

export default function GoldStockList() {
  const [items,   setItems]   = useState([])
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [modal,   setModal]   = useState(null) // null | 'new' | GoldItem (edit)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async (s) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ListGoldItems(s)
      setItems(data || [])
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load('') }, [load])

  const handleTabChange = (s) => {
    setStatus(s)
    load(s)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await DeleteGoldItem(confirmDelete.id)
      setConfirmDelete(null)
      load(status)
    } catch (e) {
      setError(String(e))
      setConfirmDelete(null)
    }
  }

  // Summary stats
  const available = items.filter(i => i.status === 'available')
  const sold      = items.filter(i => i.status === 'sold')
  const totalWeightAvail = available.reduce((s, i) => s + (i.weight_baht || 0), 0)

  return (
    <div className="page-view">
      <div className="page-header">
        <div>
          <div className="page-title">สต็อกทองคำ</div>
          <div className="page-meta">
            {!loading && `มีอยู่ ${available.length} รายการ · ${totalWeightAvail.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} บาททอง`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <IconPlus /> เพิ่มรายการทอง
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="gl-summary">
          <SummaryCard
            label="มีอยู่"
            value={available.length}
            sub={`${totalWeightAvail.toFixed(2)} บาท`}
            color="green"
          />
          <SummaryCard
            label="ขายแล้ว"
            value={sold.length}
            color="muted"
          />
          <SummaryCard
            label="รวมทั้งหมด"
            value={items.length}
            sub={`${items.reduce((s,i)=>s+i.weight_baht,0).toFixed(2)} บาท`}
            color="gold"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="toolbar">
        <div className="pl-tabs">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              className={`pl-tab ${status === t.value ? 'pl-tab-active' : ''}`}
              onClick={() => handleTabChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ประเภท</th>
                <th style={{ textAlign: 'right' }}>น้ำหนัก (บาท)</th>
                <th>ความบริสุทธิ์</th>
                <th>รายละเอียด</th>
                <th>สถานะ</th>
                <th>วันที่เพิ่ม</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={8}>กำลังโหลด...</td></tr>
              ) : items.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan={8}>
                    {status === 'available' ? 'ไม่มีทองในสต็อก'
                      : status === 'sold'  ? 'ยังไม่มีรายการที่ขาย'
                      : 'ยังไม่มีรายการทอง'}
                  </td>
                </tr>
              ) : items.map((item, i) => (
                <tr
                  key={item.id}
                  className={item.status === 'sold' ? 'gl-row-sold' : ''}
                  onClick={() => item.status === 'available' && setModal(item)}
                  style={{ cursor: item.status === 'available' ? 'pointer' : 'default' }}
                >
                  <td className="gl-index">{i + 1}</td>
                  <td className="gl-type">{item.type}</td>
                  <td className="gl-weight">{item.weight_baht.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</td>
                  <td>
                    {item.purity ? (
                      <span className={`badge ${PURITY_COLOR[item.purity] || 'badge-muted'}`}>
                        {item.purity}
                      </span>
                    ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>
                  <td className="gl-desc">{item.description || '—'}</td>
                  <td>
                    <span className={`badge ${item.status === 'available' ? 'badge-green' : 'badge-muted'}`}>
                      {item.status === 'available' ? 'มีอยู่' : 'ขายแล้ว'}
                    </span>
                  </td>
                  <td className="gl-date">{toBE(item.created_at)}</td>
                  <td className="gl-actions" onClick={e => e.stopPropagation()}>
                    {item.status === 'available' && (
                      <>
                        <button className="btn btn-ghost btn-xs" onClick={() => setModal(item)}>แก้ไข</button>
                        <button className="btn btn-danger-ghost btn-xs" onClick={() => setConfirmDelete(item)}>ลบ</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form modal */}
      {modal !== null && (
        <GoldStockForm
          item={modal === 'new' ? null : modal}
          onSaved={() => { setModal(null); load(status) }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">ยืนยันการลบ</div>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                ต้องการลบ <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.type}</strong>
                {' '}({confirmDelete.weight_baht} บาท) ออกจากสต็อก?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
              <button className="btn" style={{ background: 'var(--red)', color: '#fff', border: 'none' }} onClick={handleDelete}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, color }) {
  const colors = {
    green: { bg: 'var(--green-bg)',  text: 'var(--green)'  },
    gold:  { bg: 'var(--bg-hover)', text: 'var(--gold)'   },
    muted: { bg: 'var(--bg-hover)', text: 'var(--text-muted)' },
  }
  const c = colors[color] || colors.muted
  return (
    <div className="gl-stat" style={{ background: c.bg, border: '1px solid var(--border)' }}>
      <div className="gl-stat-value" style={{ color: c.text }}>{value}</div>
      <div className="gl-stat-label">{label}</div>
      {sub && <div className="gl-stat-sub">{sub}</div>}
    </div>
  )
}

function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
