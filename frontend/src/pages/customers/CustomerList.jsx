import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GetCustomers,
  DeleteCustomer,
} from 'wailsjs/go/handlers/CustomerHandler'
import { fullName, toBE } from '@/utils/thai'
import CustomerForm from './CustomerForm'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faPhone } from '@fortawesome/free-solid-svg-icons'
import './CustomerList.css'

// ─── Avatar colour rotation (5 warm/cool palettes) ───────────────────────────
const AVATAR_CLASSES = ['av0', 'av1', 'av2', 'av3', 'av4']

function initials(customer) {
  const f = (customer.first_name || customer.firstname || '?').charAt(0)
  const l = (customer.last_name || customer.lastname || '').charAt(0)
  return f + l
}

function shortAddress(c) {
  return [c.tambon, c.amphoe, c.province].filter(Boolean).slice(0, 2).join(', ') || null
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerList() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)      // null | 'new' | id
  const [confirmDelete, setConfirmDelete] = useState(null)      // customer obj

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

  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) {
      load(search)
      isMounted.current = true
      return
    }
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

  return (
    <div className="page-view">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">ลูกค้า</div>
          <div className="page-meta">
            {loading && customers.length > 0 ? 'กำลังโหลด...' : `${customers.length} ราย`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          เพิ่มลูกค้า
        </button>
      </div>

      {/* ── Search toolbar ────────────────────────────────────── */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="input search-input"
            placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตร..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>ล้าง</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Card grid ─────────────────────────────────────────── */}
      {loading && customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-text">กำลังโหลด...</div>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-text">
            {search ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีข้อมูลลูกค้า'}
          </div>
          {!search && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal('new')}>
              เพิ่มลูกค้าใหม่
            </button>
          )}
        </div>
      ) : (
        <div className="cl-grid">
          {customers.map((c, i) => (
            <CustomerCard
              key={c.id}
              customer={c}
              index={i}
              onOpen={() => navigate(`/customers/${c.id}`)}
              onEdit={e => { e.stopPropagation(); setModal(c.id) }}
              onDelete={e => { e.stopPropagation(); setConfirmDelete(c) }}
            />
          ))}
        </div>
      )}

      {/* ── Customer Form Modal ───────────────────────────────── */}
      {modal !== null && (
        <CustomerForm
          customerId={modal === 'new' ? null : modal}
          onSaved={() => { setModal(null); load(search) }}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Confirm Delete Modal ──────────────────────────────── */}
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
                <strong style={{ color: 'var(--text-primary)' }}>{fullName(confirmDelete)}</strong>{' '}
                ออกจากระบบหรือไม่?
                <br />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ข้อมูลที่ถูกลบไม่สามารถกู้คืนได้
                </span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
              <button
                className="btn"
                style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                onClick={handleDelete}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Customer Card ────────────────────────────────────────────────────────────
function CustomerCard({ customer: c, index, onOpen, onEdit, onDelete }) {
  const avClass = AVATAR_CLASSES[index % AVATAR_CLASSES.length]
  const addr = shortAddress(c)

  return (
    <div className="cl-card" onClick={onOpen}>

      {/* Hover-reveal action buttons */}
      <div className="cl-card-actions" onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-xs" onClick={onEdit} title="แก้ไข">แก้ไข</button>
        <button className="btn btn-danger-ghost btn-xs" onClick={onDelete} title="ลบ">ลบ</button>
      </div>

      {/* Avatar + name */}
      <div className="cl-card-top">
        <div className={`cl-avatar ${avClass}`}>{initials(c)}</div>
        <div className="cl-card-name-wrap">
          <div className="cl-card-name">{fullName(c)}</div>
          <div className="cl-card-date">เพิ่มเมื่อ {toBE(c.created_at)}</div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="cl-card-details">
        <div className={`cl-card-row ${c.phone ? '' : 'cl-card-row-empty'}`}>
          <FontAwesomeIcon icon={faPhone} />
          <span>{c.phone || 'ไม่มีเบอร์โทร'}</span>
        </div>
        <div className={`cl-card-row ${addr ? '' : 'cl-card-row-empty'}`}>
          <FontAwesomeIcon icon={faLocationDot} />
          <span>{addr || 'ไม่มีที่อยู่'}</span>
        </div>
      </div>

    </div>
  )
}

