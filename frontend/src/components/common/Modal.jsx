/**
 * Modal — Dialog genérico com overlay e container Stitches
 */
import { useEffect } from 'react'
import { styled, keyframes } from '@/styles/stitches.config'

const fadeIn = keyframes({
  from: { opacity: 0 },
  to:   { opacity: 1 },
})

const slideIn = keyframes({
  from: { opacity: 0, transform: 'translateY(-8px) scale(0.97)' },
  to:   { opacity: 1, transform: 'translateY(0) scale(1)' },
})

const Overlay = styled('div', {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(2px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  px: '$4',
  animation: `${fadeIn} 150ms ease`,
})

const Container = styled('div', {
  backgroundColor: '$surface',
  borderRadius: '$xl',
  border: '1px solid $border',
  boxShadow: '$xl',
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  animation: `${slideIn} 150ms ease`,

  variants: {
    size: {
      sm: { maxWidth: '400px' },
      md: { maxWidth: '560px' },
      lg: { maxWidth: '760px' },
    },
  },

  defaultVariants: { size: 'md' },
})

const Header = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: '$6',
  py: '$4',
  borderBottom: '1px solid $border',
  flexShrink: 0,
})

const Title = styled('h2', {
  fontSize: '$lg',
  fontWeight: '$semibold',
  color: '$textPrimary',
})

const CloseButton = styled('button', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  size: '32px',
  borderRadius: '$md',
  border: 'none',
  backgroundColor: 'transparent',
  color: '$textSecondary',
  cursor: 'pointer',
  fontSize: '$base',
  lineHeight: 1,
  transition: 'background-color $fast',
  '&:hover': { backgroundColor: '$gray100', color: '$textPrimary' },
})

const Body = styled('div', {
  px: '$6',
  py: '$5',
  overflowY: 'auto',
  flex: 1,
})

export const ModalFooter = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '$3',
  px: '$6',
  py: '$4',
  borderTop: '1px solid $border',
  flexShrink: 0,
})

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <Overlay onClick={onClose}>
      <Container size={size} onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{title}</Title>
          <CloseButton onClick={onClose} aria-label="Fechar">✕</CloseButton>
        </Header>
        <Body>{children}</Body>
      </Container>
    </Overlay>
  )
}
