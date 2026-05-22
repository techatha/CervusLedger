import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar         from './components/Sidebar'
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

function App() {
  return (
    <Router>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/"              element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/customers"     element={<CustomerList />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/pawns"         element={<PawnList />} />
            <Route path="/pawns/:id"     element={<PawnDetail />} />
            <Route path="/gold"          element={<GoldStockList />} />
            <Route path="/sales"         element={<SalesList />} />
            <Route path="/buy"           element={<PurchaseHistory />} />
            <Route path="/income"        element={<IncomePage />} />
            <Route path="/settings"      element={<SettingsPage />} />
            <Route path="/smartcard"     element={<SmartCardTest />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
