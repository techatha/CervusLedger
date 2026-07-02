import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { GetAllSettings } from 'wailsjs/go/settings_handler/SettingsHandler'
import { GetWiFiDisplayerIP, TestWiFiDisplayerConnection } from 'wailsjs/go/displayer_handler/DisplayerHandler'
import { GetVersion } from 'wailsjs/go/main/App'
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
  faDisplay,
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

export default function Sidebar({ cartItems }) {
  const [shopName, setShopName] = useState('ร้านทอง')
  const [readerConnected, setReaderConnected] = useState(false)
  const [displayerConnected, setDisplayerConnected] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    GetAllSettings()
      .then(data => {
        if (data && data.shop_name) {
          setShopName(data.shop_name)
        }
      })
      .catch(e => console.error('Failed to load shop name in sidebar:', e))

    GetVersion()
      .then(v => setVersion(v))
      .catch(e => console.error('Failed to load version:', e))
  }, [])

  useEffect(() => {
    const handleStatus = (e) => {
      setReaderConnected(!!e.detail?.connected)
    }
    window.addEventListener(SMARTCARD_EVENTS.READER_STATUS, handleStatus)
    return () => window.removeEventListener(SMARTCARD_EVENTS.READER_STATUS, handleStatus)
  }, [])

  useEffect(() => {
    const checkDisplayerStatus = async () => {
      try {
        const ip = await GetWiFiDisplayerIP()
        if (ip) {
          const ok = await TestWiFiDisplayerConnection(ip)
          setDisplayerConnected(ok)
        } else {
          setDisplayerConnected(false)
        }
      } catch (e) {
        setDisplayerConnected(false)
      }
    }

    checkDisplayerStatus()
    const interval = setInterval(checkDisplayerStatus, 15000)

    const handleConnect = () => setDisplayerConnected(true)
    const handleDisconnect = () => setDisplayerConnected(false)

    window.addEventListener('esp32:connected', handleConnect)
    window.addEventListener('esp32:disconnected', handleDisconnect)

    return () => {
      clearInterval(interval)
      window.removeEventListener('esp32:connected', handleConnect)
      window.removeEventListener('esp32:disconnected', handleDisconnect)
    }
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
                {item.to === '/sales' && cartItems && cartItems.length > 0 && (
                  <span className="cart-badge">{cartItems.length}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-version">{version ? `v${version}` : ''}</div>
        <div className="sidebar-status-container">
          <div
            className="sidebar-reader-status"
            title={readerConnected ? "เครื่องอ่านบัตร: เชื่อมต่ออยู่" : "เครื่องอ่านบัตร: ไม่พบอุปกรณ์"}
          >
            <FontAwesomeIcon icon={faHardDrive} className="status-icon" />
            <span className={`status-dot ${readerConnected ? 'connected' : 'disconnected'}`} />
          </div>
          <div
            className="sidebar-displayer-status"
            title={displayerConnected ? "หน้าจอ QR Code: เชื่อมต่ออยู่" : "หน้าจอ QR Code: ไม่พบอุปกรณ์"}
          >
            <FontAwesomeIcon icon={faDisplay} className="status-icon" />
            <span className={`status-dot ${displayerConnected ? 'connected' : 'disconnected'}`} />
          </div>
        </div>
      </div>
    </aside>
  )
}
