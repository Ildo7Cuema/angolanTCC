import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import FloatingBackground from './components/FloatingBackground'
import MobileNavigation from './components/MobileNavigation'
import PageTransition from './components/ui/PageTransition'

// ─── Lazy-loaded pages — code-splitting + faster TTI ─────────────────────
const LandingPage    = lazy(() => import('./pages/LandingPage'))
const LoginPage      = lazy(() => import('./pages/LoginPage'))
const RegisterPage   = lazy(() => import('./pages/RegisterPage'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const NewProject     = lazy(() => import('./pages/NewProject'))
const ProjectEditor  = lazy(() => import('./pages/ProjectEditor'))
const PaymentPage    = lazy(() => import('./pages/PaymentPage'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading-spinner" />
    </div>
  )
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!user || user.email !== 'ildocuema@gmail.com') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

/**
 * AppShell — combina rotas + page transitions + suspense para lazy chunks.
 *
 * O `PageTransition` (interno) já obtém a `useLocation()` e usa-a como
 * `key` da `motion.div` para animar entre rotas. Aqui não passamos
 * `location`/`key` ao <Routes> de propósito — duplicar isso causa
 * remount em cascata do Suspense quando combinado com lazy() e gera
 * warnings em modo Strict.
 */
function AppShell() {
  return (
    <Suspense fallback={<FullscreenLoader />}>
      <PageTransition>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/new-project" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
          <Route path="/project/:id" element={<ProtectedRoute><ProjectEditor /></ProtectedRoute>} />
          <Route path="/payment/:id" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <FloatingBackground />
        <Toaster
          position="top-center"
          gutter={10}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(16px)',
              color: '#0F172A',
              border: '1px solid rgba(15,23,42,0.06)',
              borderRadius: '14px',
              padding: '12px 16px',
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18)',
              maxWidth: '90vw',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#ECFDF5' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#FEF2F2' } },
          }}
        />
        <div className="relative z-10 flex-1 flex flex-col min-h-screen">
          <AppShell />
        </div>
        <MobileNavigation />
      </Router>
    </AuthProvider>
  )
}
