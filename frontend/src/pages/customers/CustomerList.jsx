import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GetCustomers,
  DeleteCustomer,
} from '../../../wailsjs/go/main/App'
import { fullName, toBE } from '../../utils/thai'
import CustomerForm from './CustomerForm'
import './CustomerList.css'

export default function CustomerList() {
  const navigate  = useNavigate()
  const [customers, setCustomers] = useState([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // Modal state: null = closed, 'new' = new form, number = edit by id
  const [modal, setModal] = useState(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null) // customer obj

  const load = useCallback(async (q = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await GetCustomers(q)
      setCustomers(data || [])
    } catch (e) {
      setError('โหลดข้อมูลลูกค้าไม่สำเร็จ: ' + e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load('')
  }, [load])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(search), 250)
    return () => clearTimeout(t)
  }, [search, load])

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await DeleteCustomer(confirmDelete.id)
      setConfirmDelete(null)
      load(search)
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + e)
    }
  }

  const handleFormSaved = () => {
    setModal(null)
    load(search)
  }

  return (
    <div className="page-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">ลูกค้า</div>
          <div className="page-meta">
            {!loading && `${customers.length} ราย`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          เพิ่มลูกค้า
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            className="input search-input"
            placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตร..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>
            ล้าง
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ชื่อ-นามสกุล</th>
                <th>เบอร์โทร</th>
                <th>เลขบัตรประชาชน</th>
                <th>ที่อยู่</th>
                <th>วันที่เพิ่ม</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row">
                  <td colSpan={7}>กำลังโหลด...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr className="loading-row">
                  <td colSpan={7}>
                    {search ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีข้อมูลลูกค้า'}
                  </td>
                </tr>
              ) : (
                customers.map((c, i) => (
                  <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                    <td className="cl-index">{i + 1}</td>
                    <td className="cl-name">{fullName(c)}</td>
                    <td className="cl-phone">{c.phone || '—'}</td>
                    <td className="cl-idcard">
                      {c.id_card ? (
                        <span className="id-card-mask">
                          {maskIDCard(c.id_card)}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td className="cl-address">{shortAddress(c)}</td>
                    <td className="cl-date">{toBE(c.created_at)}</td>
                    <td className="cl-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setModal(c.id)}
                        title="แก้ไข"
                      >
                        แก้ไข
                      </button>
                      <button
                        className="btn btn-danger-ghost btn-xs"
                        onClick={() => setConfirmDelete(c)}
                        title="ลบ"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Form Modal */}
      {modal !== null && (
        <CustomerForm
          customerId={modal === 'new' ? null : modal}
          onSaved={handleFormSaved}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">ยืนยันการลบ</div>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                ต้องการลบ{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {fullName(confirmDelete)}
                </strong>{' '}
                ออกจากระบบหรือไม่?<br />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ข้อมูลที่ถูกลบไม่สามารถกู้คืนได้
                </span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                ยกเลิก
              </button>
              <button className="btn btn-danger-ghost" onClick={handleDelete}
                style={{ background: 'var(--red)', color: '#fff', border: 'none' }}>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function maskIDCard(id) {
  if (!id || id.length < 4) return id
  return id.slice(0, 1) + ' xxxx xxxxx ' + id.slice(-2)
}

function shortAddress(c) {
  const parts = [c.tambon, c.amphoe, c.province].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
