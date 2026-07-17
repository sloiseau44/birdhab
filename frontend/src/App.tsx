import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PropertiesPage } from './pages/PropertiesPage'
import { TenantsPage } from './pages/TenantsPage'
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
                <Route path="/leases" element={<ComingSoonPage title="Baux" />} />
                <Route path="/payments" element={<ComingSoonPage title="Paiements" />} />
                <Route path="/documents" element={<ComingSoonPage title="Documents" />} />
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
