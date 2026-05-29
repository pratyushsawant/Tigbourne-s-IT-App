import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import { Terms, Privacy, NDA } from './pages/Legal'
import NotFound from './pages/NotFound'
import AppLayout from './pages/app/AppLayout'
import Dashboard from './pages/app/Dashboard'
import Explorer from './pages/app/Explorer'
import Analytics from './pages/app/Analytics'
import FieldDetail from './pages/app/FieldDetail'
import Integrity from './pages/app/Integrity'
import Settings from './pages/app/Settings'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { Permission } from './context/AuthContext'
import type { ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/signin" state={{ from: loc.pathname }} replace />
  return <>{children}</>
}

function RequirePermission({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { can } = useAuth()
  if (!can(perm)) return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/nda" element={<NDA />} />
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="analytics" element={<Analytics />} />
          <Route
            path="integrity"
            element={
              <RequirePermission perm="dataIntegrity">
                <Integrity />
              </RequirePermission>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="field/:id" element={<FieldDetail />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}
