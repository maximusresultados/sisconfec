/**
 * App — Roteamento principal do SisConfec
 *
 * Rotas públicas: /login
 * Rotas protegidas: todas as demais (requerem sessão autenticada)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { globalStyles } from '@/styles/stitches.config'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'

// Páginas
import Login         from '@/pages/Auth/Login'
import Dashboard     from '@/pages/Dashboard/Dashboard'
import InventoryList from '@/pages/Inventory/InventoryList'
import InventoryMovements from '@/pages/Inventory/InventoryMovements'

// Lazy imports (carregados sob demanda)
import { lazy, Suspense } from 'react'
const CuttingOrders    = lazy(() => import('@/pages/Production/CuttingOrders'))
const FactionDispatches = lazy(() => import('@/pages/Faction/FactionDispatches'))
const Seamstresses     = lazy(() => import('@/pages/Faction/Seamstresses'))
const Reports          = lazy(() => import('@/pages/Reports/Reports'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

// Guarda de rota — redireciona para /login se não autenticado
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      Carregando...
    </div>
  )

  return session ? children : <Navigate to="/login" replace />
}

function App() {
  // Aplica o reset global do Stitches
  globalStyles()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div style={{ padding: 24 }}>Carregando módulo...</div>}>
            <Routes>
              {/* Rota pública */}
              <Route path="/login" element={<Login />} />

              {/* Rotas protegidas com layout */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />

                {/* Estoque */}
                <Route path="estoque/tecidos"          element={<InventoryList />} />
                <Route path="estoque/movimentacoes"    element={<InventoryMovements />} />

                {/* Produção */}
                <Route path="producao/ordens"          element={<CuttingOrders />} />

                {/* Facção */}
                <Route path="faccao/remessas"          element={<FactionDispatches />} />
                <Route path="faccao/costureiras"       element={<Seamstresses />} />

                {/* Relatórios */}
                <Route path="relatorios"               element={<Reports />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
