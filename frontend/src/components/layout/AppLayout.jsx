/**
 * AppLayout — Layout principal da aplicação autenticada
 * Inclui topbar mobile com hamburger e overlay para o drawer da Sidebar.
 */
import { useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import Sidebar from './Sidebar'

const Wrapper = styled('div', {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '$background',
})

const Main = styled('main', {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  // No mobile, deixa espaço para o topbar fixo
  '@media (max-width: 767px)': {
    paddingTop: '56px',
  },
})

const PageContent = styled('div', {
  flex: 1,
  px: '$6',
  py: '$6',
  maxWidth: '$maxPage',
  width: '100%',
  mx: 'auto',
  '@media (max-width: 767px)': {
    px: '$4',
    py: '$4',
  },
})

// Topbar visível apenas no mobile
const Topbar = styled('header', {
  display: 'none',
  '@media (max-width: 767px)': {
    display: 'flex',
    alignItems: 'center',
    gap: '$3',
    px: '$4',
    height: '56px',
    backgroundColor: '$gray900',
    borderBottom: '1px solid $gray700',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
})

const HamburgerBtn = styled('button', {
  background: 'none',
  border: 'none',
  color: '$gray300',
  cursor: 'pointer',
  padding: '$1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$md',
  '&:hover': { color: 'white', backgroundColor: '$gray800' },
  '& svg': { width: '22px', height: '22px' },
})

const TopbarTitle = styled('span', {
  fontSize: '$base',
  fontWeight: '$semibold',
  color: '$primary200',
  letterSpacing: '-0.01em',
})

// Overlay escuro por trás do drawer no mobile
const Overlay = styled('div', {
  display: 'none',
  '@media (max-width: 767px)': {
    display: 'block',
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(1px)',
    animation: 'fadeIn 0.2s ease',
  },
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to:   { opacity: 1 },
  },
})

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Fecha o drawer ao navegar
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // Fecha ao mudar de rota (caso o NavLink não dispare o onClose)
  useState(() => { closeSidebar() }, [location.pathname])

  return (
    <Wrapper>
      {/* Topbar mobile */}
      <Topbar>
        <HamburgerBtn onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <Menu />
        </HamburgerBtn>
        <TopbarTitle>SisConfec</TopbarTitle>
      </Topbar>

      {/* Overlay para fechar o drawer clicando fora */}
      {sidebarOpen && <Overlay onClick={closeSidebar} />}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <Main>
        <PageContent>
          <Outlet />
        </PageContent>
      </Main>
    </Wrapper>
  )
}
