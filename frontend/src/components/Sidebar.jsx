import { NavLink } from 'react-router-dom'
import './Sidebar.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faHouse,
  faGem, 
  faBoxesStacked, 
  faPiggyBank, 
  faSackDollar, 
  faGears, 
  faUsers,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons'

const NAV = [
  {
    group: null,
    items: [
      { to: '/dashboard', icon: <FontAwesomeIcon icon={faHouse} />, label: 'แดชบอร์ด' },
    ],
  },
  {
    group: 'ลูกค้า & จำนำ',
    items: [
      { to: '/customers', icon: <FontAwesomeIcon icon={faUsers} />, label: 'ลูกค้า' },
      { to: '/pawns', icon: <FontAwesomeIcon icon={faClipboardList} />, label: 'จำนำ' },
    ],
  },
  {
    group: 'ทอง & ขาย',
    items: [
      { to: '/gold', icon: <FontAwesomeIcon icon={faBoxesStacked} />, label: 'สต็อกทอง' },
      { to: '/sales', icon: <FontAwesomeIcon icon={faSackDollar} />, label: 'ซื้อ-ขาย' },
    ],
  },
  {
    group: 'การเงิน',
    items: [
      { to: '/income', icon: <FontAwesomeIcon icon={faPiggyBank} />, label: 'รายรับ-รายจ่าย' },
    ],
  },
  {
    group: null,
    items: [
      { to: '/settings', icon: <FontAwesomeIcon icon={faGears} />, label: 'ตั้งค่า' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><FontAwesomeIcon icon={faGem} /></div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-main">ห้างทองแต้ยืนยง</span>
          <span className="sidebar-logo-sub">Cervus Ledger</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map((section, si) => (
          <div key={si} className="sidebar-section">
            {section.group && (
              <div className="sidebar-group-label">{section.group}</div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  'sidebar-link' + (isActive ? ' sidebar-link-active' : '')
                }
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-version">v0.1.0</div>
      </div>
    </aside>
  )
}

/* ─── Inline SVG Icons ──────────────────────────────────────────── */

function IconCustomers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
