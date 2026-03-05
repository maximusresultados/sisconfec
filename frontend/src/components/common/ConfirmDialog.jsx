/**
 * ConfirmDialog — Modal de confirmação para ações destrutivas
 *
 * Uso:
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleDelete}
 *     title="Desativar tecido"
 *     message="Esta ação não pode ser desfeita. Deseja continuar?"
 *     confirmLabel="Desativar"
 *     danger
 *   />
 */
import { AlertTriangle, Info } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { Modal, ModalFooter } from './Modal'
import { Button } from './Button'

const Content = styled('div', {
  display: 'flex',
  gap: '$4',
  alignItems: 'flex-start',
})

const IconBox = styled('div', {
  size: '44px',
  borderRadius: '$full',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  variants: {
    danger: {
      true:  { backgroundColor: '$danger50',   color: '$danger700'  },
      false: { backgroundColor: '$primary100', color: '$primary700' },
    },
  },
  defaultVariants: { danger: 'true' },
})

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  danger = true,
  loading = false,
}) {
  function handleConfirm() {
    onConfirm()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <Content>
        <IconBox danger={danger}>
          {danger ? <AlertTriangle size={22} /> : <Info size={22} />}
        </IconBox>
        <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.7 }}>
          {message}
        </p>
      </Content>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Aguarde...' : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
