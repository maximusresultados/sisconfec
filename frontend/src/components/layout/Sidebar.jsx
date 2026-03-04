/**
 * Sidebar — Menu lateral de navegação
 *
 * Exibe apenas os itens de menu que o role do usuário pode acessar.
 */
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Scissors, Shirt,
  Users, BarChart2, ChevronRight, LogOut, ClipboardList,
} from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { useAuth } from '@/contexts/AuthContext'

// ------- ESTILOS -------
const SidebarWrapper = styled('aside', {
  width: '$sidebar',
  minHeight: '100vh',
  backgroundColor: '$gray900',
  color: '$textInverse',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
})

const Logo = styled('div', {
  px: '$6',
  py: '$5',
  borderBottom: '1px solid $gray700',

  '& h1': {
    fontSize: '$xl',
    fontWeight: '$bold',
    color: '$primary200',
    letterSpacing: '-0.02em',
  },
  '& span': {
    fontSize: '$xs',
    color: '$gray400',
  },
})

const Nav = styled('nav', {
  flex: 1,
  py: '$4',
  overflowY: 'auto',
})

const NavSection = styled('div', {
  mb: '$2',
  '& p': {
    px: '$6',
    py: '$2',
    fontSize: '$xs',
    fontWeight: '$semibold',
    color: '$gray500',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
})

const NavItem = styled(NavLink, {
  display: 'flex',
  alignItems: 'center',
  gap: '$3',
  px: '$6',
  py: '$3',
  fontSize: '$sm',
  color: '$gray300',
  transition: 'background-color $fast, color $fast',
  cursor: 'pointer',
  textDecoration: 'none',

  '& svg': { width: '18px', height: '18px', flexShrink: 0 },

  '&:hover': {
    backgroundColor: '$gray800',
    color: '$textInverse',
  },

  '&.active': {
    backgroundColor: '$primary600',
    color: '$textInverse',
  },
})

const UserArea = styled('div', {
  px: '$6',
  py: '$4',
  borderTop: '1px solid $gray700',
  display: 'flex',
  alignItems: 'center',
  gap: '$3',
})

const Avatar = styled('div', {
  size: '36px',
  borderRadius: '$full',
  backgroundColor: '$primary700',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '$sm',
  fontWeight: '$bold',
  flexShrink: 0,
})

const LogoutBtn = styled('button', {
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  color: '$gray400',
  cursor: 'pointer',
  padding: '$1',
  borderRadius: '$md',
  '&:hover': { color: '$danger500', backgroundColor: '$gray800' },
  '& svg': { width: '16px', height: '16px' },
})

// ------- DEFINIÇÃO DO MENU -------
const NAV_ITEMS = [
  {
    section: 'Geral',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','estoquista','encarregado_corte','gestor_faccao'] },
    ],
  },
  {
    section: 'Estoque',
    items: [
      { to: '/estoque/tecidos', label: 'Tecidos', icon: Package, roles: ['admin','estoquista'] },
      { to: '/estoque/movimentacoes', label: 'Movimentações', icon: BarChart2, roles: ['admin','estoquista'] },
    ],
  },
  {
    section: 'Produção',
    items: [
      { to: '/producao/fichas-tecnicas', label: 'Fichas Técnicas', icon: ClipboardList, roles: ['admin','encarregado_corte'] },
      { to: '/producao/ordens',          label: 'Ordens de Corte', icon: Scissors,      roles: ['admin','encarregado_corte'] },
    ],
  },
  {
    section: 'Facção',
    items: [
      { to: '/faccao/remessas', label: 'Remessas', icon: Shirt, roles: ['admin','gestor_faccao'] },
      { to: '/faccao/costureiras', label: 'Costureiras', icon: Users, roles: ['admin','gestor_faccao'] },
    ],
  },
  {
    section: 'Relatórios',
    items: [
      { to: '/relatorios', label: 'Relatórios', icon: BarChart2, roles: ['admin'] },
    ],
  },
]

// ------- COMPONENTE -------
export default function Sidebar() {
  const { profile, signOut } = useAuth()

  const initials = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() ?? '?'

  const ROLE_LABEL = {
    admin:            'Administrador',
    estoquista:       'Estoquista',
    encarregado_corte:'Encarregado de Corte',
    gestor_faccao:    'Gestor de Facção',
  }

  return (
    <SidebarWrapper>
      <Logo>
        <img
          src="/logo-sard.png"
          alt="Sard"
          style={{ height: '36px', width: 'auto', filter: 'invert(1)', display: 'block' }}
        />
        <span>Gestão de Confecção</span>
      </Logo>

      <Nav>
        {NAV_ITEMS.map(({ section, items }) => {
          const visibleItems = items.filter(
            item => profile && item.roles.includes(profile.role)
          )
          if (!visibleItems.length) return null

          return (
            <NavSection key={section}>
              <p>{section}</p>
              {visibleItems.map(({ to, label, icon: Icon }) => (
                <NavItem key={to} to={to} end={to === '/'}>
                  <Icon />
                  {label}
                  <ChevronRight style={{ marginLeft: 'auto', width: 14, height: 14, opacity: 0.4 }} />
                </NavItem>
              ))}
            </NavSection>
          )
        })}
      </Nav>

      <UserArea>
        <Avatar>{initials}</Avatar>
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f9fafb' }}>
            {profile?.full_name ?? 'Carregando...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {ROLE_LABEL[profile?.role] ?? ''}
          </div>
        </div>
        <LogoutBtn onClick={signOut} title="Sair">
          <LogOut />
        </LogoutBtn>
      </UserArea>
    </SidebarWrapper>
  )
}
