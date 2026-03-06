/**
 * NotificationBell — Sino de alertas de estoque baixo com Realtime
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  right: 0,
  width: '300px',
  backgroundColor: '$surface',
  border: '1px solid $border',
  borderRadius: '$lg',
  boxShadow: '$xl',
  zIndex: 200,
  overflow: 'hidden',
})

const DropHeader = styled('div', {
  px: '$3',
  py: '$2',
  borderBottom: '1px solid $border',
  fontSize: '$xs',
  fontWeight: '$semibold',
  color: '$textSecondary',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

const AlertItem = styled('div', {
  px: '$3',
  py: '$2',
  borderBottom: '1px solid $border',
  '&:last-child': { borderBottom: 'none' },
  '&:hover': { backgroundColor: '$gray50' },
})

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

const EmptyMsg = styled('div', {
  px: '$3',
  py: '$5',
  textAlign: 'center',
  fontSize: '$xs',
  color: '$textSecondary',
})

export default function NotificationBell() {
  const { profile } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [open,   setOpen]   = useState(false)
  const wrapperRef = useRef(null)

  const loadAlerts = useCallback(async () => {
    if (!profile?.tenant_id) return
    const { data } = await supabase
      .from('vw_low_stock_alerts')
      .select('id, code, description, current_stock, minimum_stock, unit')
      .eq('tenant_id', profile.tenant_id)
      .limit(15)
    setAlerts(data ?? [])
  }, [profile?.tenant_id])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    if (!profile?.tenant_id) return
    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_transactions',
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

  return (
    <Wrapper ref={wrapperRef}>
      <BellBtn onClick={() => setOpen(o => !o)} title="Alertas de estoque baixo">
        <Bell />
        {alerts.length > 0 && (
          <CountBadge>{alerts.length > 9 ? '9+' : alerts.length}</CountBadge>
        )}
      </BellBtn>

      {open && (
        <Dropdown>
          <DropHeader>
            <span>Estoque baixo</span>
            <span style={{ color: alerts.length > 0 ? '#b91c1c' : 'inherit' }}>
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
            </span>
          </DropHeader>

          {alerts.length === 0 ? (
            <EmptyMsg>Nenhum alerta de estoque.</EmptyMsg>
          ) : (
            alerts.map(a => (
              <AlertItem key={a.id}>
                <AlertName>[{a.code}] {a.description}</AlertName>
                <AlertStock>
                  Atual: {Number(a.current_stock).toFixed(1)} / Mín: {Number(a.minimum_stock).toFixed(1)} {a.unit}
                </AlertStock>
              </AlertItem>
            ))
          )}
        </Dropdown>
      )}
    </Wrapper>
  )
}
