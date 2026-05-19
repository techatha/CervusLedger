import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar         from './components/Sidebar'
import CustomerList    from './pages/customers/CustomerList'
import CustomerProfile from './pages/customers/CustomerProfile'
import PawnList        from './pages/pawns/PawnList'
import PawnDetail      from './pages/pawns/PawnDetail'
import GoldList        from './pages/gold/GoldList'
import SalesList       from './pages/sales/SalesList'
import IncomePage      from './pages/income/IncomePage'
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
            <Route path="/"              element={<Navigate to="/pawns" replace />} />
            <Route path="/customers"     element={<CustomerList />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/pawns"         element={<PawnList />} />
            <Route path="/pawns/:id"     element={<PawnDetail />} />
            <Route path="/gold"          element={<GoldList />} />
            <Route path="/sales"         element={<SalesList />} />
            <Route path="/income"        element={<IncomePage />} />
            <Route path="/dashboard"     element={<Placeholder title="แดชบอร์ด" />} />
            <Route path="/settings"      element={<Placeholder title="ตั้งค่า" />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
