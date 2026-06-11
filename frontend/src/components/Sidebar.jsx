import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { GetAllSettings } from 'wailsjs/go/handlers/SettingsHandler'
import './Sidebar.css'
import { SMARTCARD_EVENTS } from '@/utils/smartcard'
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
  faHardDrive,
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
    group: 'การเงิน',
    items: [
      { to: '/sales', icon: <FontAwesomeIcon icon={faSackDollar} />, label: 'ทำรายการ ซื้อ-ขาย' },
      { to: '/income', icon: <FontAwesomeIcon icon={faPiggyBank} />, label: 'บันทึก รายรับ-รายจ่าย' },
    ],
  },
  {
    group: 'สต็อกทอง',
    items: [
      { to: '/gold', icon: <FontAwesomeIcon icon={faBoxesStacked} />, label: 'สต็อกทองในร้าน' },
      { to: '/buy', icon: <FontAwesomeIcon icon={faHandHoldingDollar} />, label: 'สต็อกของเก่า' },
    ],
  },
  {
    group: 'ระบบ',
    items: [
      { to: '/settings', icon: <FontAwesomeIcon icon={faGears} />, label: 'ตั้งค่า' },
    ],
  },
]

export default function Sidebar() {
  const [shopName, setShopName] = useState('ห้างทองแต้ยืนยง')
  const [readerConnected, setReaderConnected] = useState(false)

  useEffect(() => {
    GetAllSettings()
      .then(data => {
        if (data && data.shop_name) {
          setShopName(data.shop_name)
        }
      })
      .catch(e => console.error('Failed to load shop name in sidebar:', e))
  }, [])

  useEffect(() => {
    const handleStatus = (e) => {
      setReaderConnected(!!e.detail?.connected)
    }
    window.addEventListener(SMARTCARD_EVENTS.READER_STATUS, handleStatus)
    return () => window.removeEventListener(SMARTCARD_EVENTS.READER_STATUS, handleStatus)
  }, [])

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><FontAwesomeIcon icon={faGem} /></div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-main">{shopName}</span>
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
        <div
          className="sidebar-reader-status"
          title={readerConnected ? "เครื่องอ่านบัตร: เชื่อมต่ออยู่" : "เครื่องอ่านบัตร: ไม่พบอุปกรณ์"}
        >
          <FontAwesomeIcon icon={faHardDrive} className="status-icon" />
          <span className={`status-dot ${readerConnected ? 'connected' : 'disconnected'}`} />
        </div>
      </div>
    </aside>
  )
}
