import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import CustomerList from './pages/customers/CustomerList'
import CustomerProfile from './pages/customers/CustomerProfile'
import PawnList from './pages/pawns/pawnlist'
import PawnDetail from './pages/pawns/PawnDetail' 
import './App.css'

// Placeholder pages for future steps
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
            <Route path="/" element={<Navigate to="/customers" replace />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/dashboard" element={<Placeholder title="แดชบอร์ด" />} />
            <Route path="/pawns" element={<PawnList title="จำนำ" />} />
            <Route path="/pawns/:id" element={<PawnDetail title="จำนำ" />} />
            <Route path="/gold" element={<Placeholder title="ทองคำ" />} />
            <Route path="/sales" element={<Placeholder title="ซื้อ-ขาย" />} />
            <Route path="/income" element={<Placeholder title="รายรับ-รายจ่าย" />} />
            <Route path="/settings" element={<Placeholder title="ตั้งค่า" />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
