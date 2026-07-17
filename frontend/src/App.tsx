import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PropertiesPage } from './pages/PropertiesPage'
import { TenantsPage } from './pages/TenantsPage'
import { LeasesPage } from './pages/LeasesPage'
import { ProfilePage } from './pages/ProfilePage'
import { PaymentsPage } from './pages/PaymentsPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { ComingSoonPage } from './pages/ComingSoonPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppLayout>
              <Routes>
                <Route path="/" element={<ComingSoonPage title="Tableau de bord" />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/leases" element={<LeasesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App
