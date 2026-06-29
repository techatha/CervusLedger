import { useState, useEffect, useRef } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Sidebar         from './components/Sidebar'
import SmartCardWatcher from './components/SmartCardWatcher'
import CustomerForm     from './pages/customers/CustomerForm'
import Dashboard       from './pages/dashboard/Dashboard'
import CustomerList    from './pages/customers/CustomerList'
import CustomerProfile from './pages/customers/CustomerProfile'
import PawnList        from './pages/pawns/PawnList'
import PawnDetail      from './pages/pawns/PawnDetail'
import GoldStockList   from './pages/gold_stock/GoldStockList'
import SalesList       from './pages/sales/SalesList'
import PurchaseHistory from './pages/purchase_his/PurchaseHistory'
import IncomePage      from './pages/income/IncomePage'
import SettingsPage    from './pages/settings/SettingsPage'
import SmartCardTest   from './pages/smartcard/SmartCardTest'
import { EventsOn }    from 'wailsjs/runtime/runtime.js'
import { GetPriceHistory } from 'wailsjs/go/gold_price_handler/GoldPriceHandler.js'
import { syncDevice }  from './utils/esp32Sync'
import './App.css'

const Placeholder = ({ title }) => (
  <div className="page-view">
    <div className="page-header">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-meta">อยู่ระหว่างการพัฒนา</div>
      </div>
    </div>
    <div className="empty-state">
      <div className="empty-state-icon">🚧</div>
      <div className="empty-state-text">จะเปิดใช้งานเร็วๆ นี้</div>
    </div>
  </div>
)

function AppContent() {
  const [registerCardData, setRegisterCardData] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const navigate = useNavigate()
  const lastPriceRef = useRef(null)

  useEffect(() => {
    // 1. Sync device webhook on application start
    syncDevice();

    // Seed the initial gold price state from database on startup
    GetPriceHistory(1).then((history) => {
      if (history && history.length > 0) {
        lastPriceRef.current = history[0];
      }
    }).catch(err => {
      console.error("Failed to fetch initial gold price:", err);
    });

    // 2. Listen for factory reset/disconnection event from ESP32
    const unsubscribe = EventsOn("esp32:disconnected", (data) => {
      alert("The QR Display was manually reset and has disconnected");
      // Dispatch a custom event to notify components that the device has disconnected
      window.dispatchEvent(new CustomEvent('esp32:disconnected'));
    });

    // 3. Listen for gold price updates from background scraper
    const unsubscribeGold = EventsOn("gold-price:updated", (newPrice) => {
      const currentPrice = lastPriceRef.current;

      if (currentPrice && newPrice) {
        const latest = newPrice.sell_price_per_baht || 0;
        const previous = currentPrice.sell_price_per_baht || 0;

        let soundPath = null;
        if (latest > previous) {
          soundPath = '/assets/up.mp3';
        } else if (latest < previous) {
          soundPath = '/assets/down.mp3';
        }

        if (soundPath) {
          const audio = new Audio(soundPath);
          audio.play().catch((err) => {
            console.warn("Audio playback failed (usually due to user interaction restrictions):", err);
          });
        }
      }

      // Always update our local state reference to the newest price
      if (newPrice) {
        lastPriceRef.current = newPrice;
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      if (typeof unsubscribeGold === 'function') {
        unsubscribeGold();
      }
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar cartItems={cartItems} />
      <main className="app-main">
        <Routes>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/customers"     element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerProfile />} />
          <Route path="/pawns"         element={<PawnList />} />
          <Route path="/pawns/:id"     element={<PawnDetail cartItems={cartItems} setCartItems={setCartItems} />} />
          <Route path="/gold"          element={<GoldStockList />} />
          <Route path="/sales"         element={<SalesList cartItems={cartItems} setCartItems={setCartItems} />} />
          <Route path="/buy"           element={<PurchaseHistory />} />
          <Route path="/income"        element={<IncomePage />} />
          <Route path="/settings"      element={<SettingsPage />} />
          <Route path="/smartcard"     element={<SmartCardTest />} />
        </Routes>
      </main>

      {/* Global Smartcard Insertion Watcher */}
      <SmartCardWatcher onOpenRegisterModal={(card) => setRegisterCardData(card)} />

      {/* Unregistered Customer Auto-Registration Modal */}
      {registerCardData && (
        <CustomerForm
          customerId={null}
          initialCardData={registerCardData}
          onSaved={() => setRegisterCardData(null)}
          onClose={() => setRegisterCardData(null)}
        />
      )}
    </div>
  )
}

import { PawnCacheProvider } from './context/PawnCacheContext'

function App() {
  return (
    <Router>
      <PawnCacheProvider>
        <AppContent />
      </PawnCacheProvider>
    </Router>
  )
}

export default App

