/**
 * ToastContext — Sistema global de notificações visuais
 *
 * Uso: const toast = useToast()
 *      toast.success('Tecido salvo!')
 *      toast.error('Erro ao salvar.')
 *      toast.warning('Estoque baixo.')
 *      toast.info('Operação em andamento.')
 */
import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { styled, keyframes } from '@/styles/stitches.config'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

const slideIn = keyframes({
  from: { opacity: 0, transform: 'translateX(110%)' },
  to:   { opacity: 1, transform: 'translateX(0)' },
})

const ToastWrap = styled('div', {
  position: 'fixed',
  top: '$4',
  right: '$4',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
  maxWidth: '380px',
  width: '100%',
  pointerEvents: 'none',
})

const ToastItem = styled('div', {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '$3',
  px: '$4',
  py: '$3',
  borderRadius: '$lg',
  boxShadow: '$lg',
  border: '1px solid',
  animation: `${slideIn} 250ms ease`,
  pointerEvents: 'all',

  variants: {
    type: {
      success: { backgroundColor: '$success50',  borderColor: '$success500', color: '$success700' },
      error:   { backgroundColor: '$danger50',   borderColor: '$danger500',  color: '$danger700'  },
      warning: { backgroundColor: '$warning50',  borderColor: '$warning500', color: '$warning700' },
      info:    { backgroundColor: '$primary100', borderColor: '$primary500', color: '$primary700' },
    },
  },
  defaultVariants: { type: 'info' },
})

const ToastMsg = styled('p', {
  flex: 1,
  fontSize: '$sm',
  fontWeight: '$medium',
  lineHeight: '$normal',
})

const CloseBtn = styled('button', {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: 'inherit',
  opacity: 0.6,
  padding: 0,
  display: 'flex',
  flexShrink: 0,
  '&:hover': { opacity: 1 },
})

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(p => p.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts(p => [...p, { id, message, type }])
    if (duration > 0) setTimeout(() => remove(id), duration)
    return id
  }, [remove])

  const toast = useMemo(() => ({
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur) => add(msg, 'error',   dur),
    warning: (msg, dur) => add(msg, 'warning', dur),
    info:    (msg, dur) => add(msg, 'info',    dur),
  }), [add])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <ToastWrap>
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <ToastItem key={t.id} type={t.type}>
              <Icon size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <ToastMsg>{t.message}</ToastMsg>
              <CloseBtn onClick={() => remove(t.id)} aria-label="Fechar"><X size={14} /></CloseBtn>
            </ToastItem>
          )
        })}
      </ToastWrap>
    </ToastCtx.Provider>
  )
}
