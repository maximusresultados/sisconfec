/**
 * NotificationBell — Sino de alertas de estoque baixo com Realtime e "marcar como lido"
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const STORAGE_KEY = 'sisconfec_dismissed_alerts'

function loadDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')) }
  catch { return new Set() }
}

function saveDismissed(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

// ------- ESTILOS -------
const Wrapper = styled('div', {
  position: 'relative',
})

const BellBtn = styled('button', {
  background: 'none',
  border: 'none',
  color: '$gray400',
  cursor: 'pointer',
  padding: '$1',
  borderRadius: '$md',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  '&:hover': { color: '$gray100', backgroundColor: '$gray800' },
  '& svg': { width: '16px', height: '16px' },
})

const CountBadge = styled('span', {
  position: 'absolute',
  top: '-3px',
  right: '-3px',
  minWidth: '15px',
  height: '15px',
  backgroundColor: '$danger500',
  color: 'white',
  borderRadius: '$full',
  fontSize: '9px',
  fontWeight: '$bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  px: '2px',
  lineHeight: 1,
})

const Dropdown = styled('div', {
  position: 'fixed',
  width: '300px',
  backgroundColor: '$surface',
  border: '1px solid $border',
  borderRadius: '$lg',
  boxShadow: '$xl',
  zIndex: 200,
  overflow: 'hidden',
  maxHeight: '400px',
  display: 'flex',
  flexDirection: 'column',
})

const DropHeader = styled('div', {
  px: '$3',
  py: '$2',
  borderBottom: '1px solid $border',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
})

const DropTitle = styled('span', {
  fontSize: '$xs',
  fontWeight: '$semibold',
  color: '$textSecondary',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
})

const MarkAllBtn = styled('button', {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '$primary500',
  fontSize: '$xs',
  fontWeight: '$medium',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 4px',
  borderRadius: '$sm',
  '&:hover': { backgroundColor: '$primary50', color: '$primary700' },
  '& svg': { width: '12px', height: '12px' },
  '&:disabled': { opacity: 0.4, cursor: 'default', '&:hover': { backgroundColor: 'transparent' } },
})

const AlertList = styled('div', {
  overflowY: 'auto',
  flex: 1,
})

const AlertItem = styled('div', {
  px: '$3',
  py: '$2',
  borderBottom: '1px solid $border',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '$2',
  '&:last-child': { borderBottom: 'none' },
  variants: {
    read: {
      true: { opacity: 0.45 },
    },
  },
})

const AlertText = styled('div', { flex: 1 })

const AlertName = styled('div', {
  fontSize: '$xs',
  fontWeight: '$medium',
  color: '$danger700',
})

const AlertStock = styled('div', {
  fontSize: '$xs',
  color: '$textSecondary',
  mt: '2px',
})

const DismissBtn = styled('button', {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '$gray400',
  padding: '2px',
  borderRadius: '$sm',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  mt: '1px',
  '&:hover': { color: '$gray700', backgroundColor: '$gray100' },
  '& svg': { width: '12px', height: '12px' },
})

const EmptyMsg = styled('div', {
  px: '$3',
  py: '$5',
  textAlign: 'center',
  fontSize: '$xs',
  color: '$textSecondary',
})

// ------- COMPONENTE -------
export default function NotificationBell() {
  const { profile } = useAuth()
  const [alerts,    setAlerts]    = useState([])
  const [dismissed, setDismissed] = useState(loadDismissed)
  const [open,      setOpen]      = useState(false)
  const [dropPos,   setDropPos]   = useState({ top: 0, left: 0 })
  const wrapperRef = useRef(null)
  const btnRef     = useRef(null)

  const loadAlerts = useCallback(async () => {
    if (!profile?.tenant_id) return
    const { data } = await supabase
      .from('vw_low_stock_alerts')
      .select('id, code, description, current_stock, minimum_stock, unit')
      .eq('tenant_id', profile.tenant_id)
      .limit(20)

    const fetched = data ?? []
    setAlerts(fetched)

    // Remove IDs dispensados que já não existem mais na view
    setDismissed(prev => {
      const activeIds = new Set(fetched.map(a => a.id))
      const cleaned   = new Set([...prev].filter(id => activeIds.has(id)))
      if (cleaned.size !== prev.size) saveDismissed(cleaned)
      return cleaned
    })
  }, [profile?.tenant_id])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  useEffect(() => {
    if (!profile?.tenant_id) return
    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'inventory_transactions',
        filter: `tenant_id=eq.${profile.tenant_id}`,
      }, loadAlerts)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile?.tenant_id, loadAlerts])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const dropW = 300
      let left = rect.left
      if (left + dropW > window.innerWidth - 8) left = window.innerWidth - dropW - 8
      setDropPos({ top: rect.bottom + 8, left })
    }
    setOpen(o => !o)
  }

  function dismiss(id) {
    setDismissed(prev => {
      const next = new Set(prev).add(id)
      saveDismissed(next)
      return next
    })
  }

  function markAllRead() {
    setDismissed(() => {
      const all = new Set(alerts.map(a => a.id))
      saveDismissed(all)
      return all
    })
  }

  const unreadCount = alerts.filter(a => !dismissed.has(a.id)).length

  return (
    <Wrapper ref={wrapperRef}>
      <BellBtn ref={btnRef} onClick={handleToggle} title="Alertas de estoque baixo">
        <Bell />
        {unreadCount > 0 && (
          <CountBadge>{unreadCount > 9 ? '9+' : unreadCount}</CountBadge>
        )}
      </BellBtn>

      {open && (
        <Dropdown style={{ top: dropPos.top, left: dropPos.left }}>
          <DropHeader>
            <DropTitle>
              Estoque baixo
              {alerts.length > 0 && (
                <span style={{ marginLeft: 6, color: unreadCount > 0 ? '#b91c1c' : '#6b7280', fontWeight: 400 }}>
                  ({unreadCount} não lido{unreadCount !== 1 ? 's' : ''})
                </span>
              )}
            </DropTitle>
            <MarkAllBtn onClick={markAllRead} disabled={unreadCount === 0} title="Marcar todos como lido">
              <CheckCheck />
              Marcar todos
            </MarkAllBtn>
          </DropHeader>

          <AlertList>
            {alerts.length === 0 ? (
              <EmptyMsg>Nenhum alerta de estoque.</EmptyMsg>
            ) : (
              alerts.map(a => (
                <AlertItem key={a.id} read={dismissed.has(a.id)}>
                  <AlertText>
                    <AlertName>[{a.code}] {a.description}</AlertName>
                    <AlertStock>
                      Atual: {Number(a.current_stock).toFixed(1)} / Mín: {Number(a.minimum_stock).toFixed(1)} {a.unit}
                    </AlertStock>
                  </AlertText>
                  {!dismissed.has(a.id) && (
                    <DismissBtn onClick={() => dismiss(a.id)} title="Marcar como lido">
                      <X />
                    </DismissBtn>
                  )}
                </AlertItem>
              ))
            )}
          </AlertList>
        </Dropdown>
      )}
    </Wrapper>
  )
}
