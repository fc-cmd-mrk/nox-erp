import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Contacts from './pages/Contacts'
import Products from './pages/Products'
import Transactions from './pages/Transactions'
import Payments from './pages/Payments'
import Accounts from './pages/Accounts'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Layout from './components/Layout'

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#f1f5f9',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9',
            },
          },
        }}
      />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="products" element={<Products />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="payments" element={<Payments />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  )
}

export default App

