import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import InventoryDashboard from './pages/InventoryDashboard'
import SalaryDashboard from './pages/SalaryDashboard'
import SettingsPage from './pages/SettingsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminInventoryGroupsPage from './pages/AdminInventoryGroupsPage'

function RootRedirect() {
  const { session, loading } = useAuth()
  if (loading) return null
  return <Navigate to={session ? '/inventory' : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route element={<AppLayout />}>
              <Route path="/settings" element={<SettingsPage />} />
              <Route element={<ProtectedRoute roles={['super_admin']} />}>
                <Route path="/salary" element={<SalaryDashboard />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/inventory-groups" element={<AdminInventoryGroupsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-left" richColors dir="rtl" />
      </BrowserRouter>
    </AuthProvider>
  )
}
