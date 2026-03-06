/**
 * App — Roteamento principal do SisConfec
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { globalStyles } from '@/styles/stitches.config'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import AppLayout from '@/components/layout/AppLayout'

// Páginas carregadas imediatamente
import Login           from '@/pages/Auth/Login'
import ForgotPassword  from '@/pages/Auth/ForgotPassword'
import ResetPassword   from '@/pages/Auth/ResetPassword'
import Dashboard       from '@/pages/Dashboard/Dashboard'
import InventoryList   from '@/pages/Inventory/InventoryList'
import InventoryMovements from '@/pages/Inventory/InventoryMovements'

// Páginas lazy
const CuttingOrders     = lazy(() => import('@/pages/Production/CuttingOrders'))
const TechnicalSheets   = lazy(() => import('@/pages/Production/TechnicalSheets'))
const FactionDispatches = lazy(() => import('@/pages/Faction/FactionDispatches'))
const Seamstresses      = lazy(() => import('@/pages/Faction/Seamstresses'))
const PaymentHistory    = lazy(() => import('@/pages/Faction/PaymentHistory'))
const Reports           = lazy(() => import('@/pages/Reports/Reports'))
const Users             = lazy(() => import('@/pages/Admin/Users'))
const ActivityLog       = lazy(() => import('@/pages/Admin/ActivityLog'))
const PurchaseOrders    = lazy(() => import('@/pages/Inventory/PurchaseOrders'))
const Profile           = lazy(() => import('@/pages/Auth/Profile'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7280', fontSize: '0.875rem' }}>
      Carregando...
    </div>
  )

  return session ? children : <Navigate to="/login" replace />
}

/** Rota visível apenas para admin */
function AdminRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function App() {
  globalStyles()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ErrorBoundary fullScreen title="Erro na aplicação">
              <BrowserRouter>
                <Suspense fallback={
                  <div style={{ padding: 32, color: '#6b7280', fontSize: '0.875rem' }}>
                    Carregando módulo...
                  </div>
                }>
                  <Routes>
                    {/* Pública */}
                    <Route path="/login"          element={<Login />} />
                    <Route path="/esqueci-senha"  element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Protegidas com layout */}
                    <Route path="/" element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<Dashboard />} />

                      {/* Estoque */}
                      <Route path="estoque/tecidos"       element={<InventoryList />} />
                      <Route path="estoque/movimentacoes" element={<InventoryMovements />} />
                      <Route path="estoque/reposicao"     element={<PurchaseOrders />} />

                      {/* Produção */}
                      <Route path="producao/fichas-tecnicas" element={<TechnicalSheets />} />
                      <Route path="producao/ordens"          element={<CuttingOrders />} />

                      {/* Facção */}
                      <Route path="faccao/remessas"        element={<FactionDispatches />} />
                      <Route path="faccao/costureiras"     element={<Seamstresses />} />
                      <Route path="faccao/pagamentos"      element={<PaymentHistory />} />

                      {/* Relatórios */}
                      <Route path="relatorios" element={<Reports />} />

                      {/* Perfil */}
                      <Route path="perfil" element={<Profile />} />

                      {/* Admin */}
                      <Route path="admin/usuarios" element={
                        <AdminRoute><Users /></AdminRoute>
                      } />
                      <Route path="admin/auditoria" element={
                        <AdminRoute><ActivityLog /></AdminRoute>
                      } />

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
