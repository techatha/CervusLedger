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
  faHandHoldingDollar,
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
      { to: '/buy', icon: <FontAwesomeIcon icon={faHandHoldingDollar} />, label: 'รับซื้อของเก่า' },
    ],
  },
  {
    group: 'การเงิน',
    items: [
      { to: '/income', icon: <FontAwesomeIcon icon={faPiggyBank} />, label: 'รายรับ-รายจ่าย' },
    ],
  },
  {
    group: 'ระบบ',
    items: [
      { to: '/settings', icon: <FontAwesomeIcon icon={faGears} />, label: 'ตั้งค่า' },
      { to: '/smartcard', icon: <IconSmartCard />, label: 'เครื่องอ่านบัตร' },
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

function IconSmartCard() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg> }
