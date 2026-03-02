/**
 * Badge — Etiqueta de status (Stitches)
 */
import { styled } from '@/styles/stitches.config'

export const Badge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '$1',
  borderRadius: '$full',
  fontSize: '$xs',
  fontWeight: '$medium',
  px: '$2',
  py: '2px',

  variants: {
    color: {
      default: { backgroundColor: '$gray100', color: '$gray700' },
      primary: { backgroundColor: '$primary100', color: '$primary700' },
      success: { backgroundColor: '$success50',  color: '$success700' },
      warning: { backgroundColor: '$warning50',  color: '$warning700' },
      danger:  { backgroundColor: '$danger50',   color: '$danger700' },
    },
  },

  defaultVariants: {
    color: 'default',
  },
})

// Mapeia o status do banco para a cor do Badge
export const STATUS_COLOR_MAP = {
  // Ordens de corte
  pendente:    'default',
  em_corte:   'primary',
  cortado:    'success',
  em_revisao: 'warning',
  aprovado:   'success',
  cancelado:  'danger',

  // Facção
  enviado:    'primary',
  em_producao:'primary',
  retornado:  'success',
  pago:       'success',

  // Pagamento
  pendente_pag: 'warning',
  pago_pag:     'success',
  cancelado_pag:'danger',
}

// Tradução dos status para português
export const STATUS_LABEL_MAP = {
  pendente:    'Pendente',
  em_corte:   'Em Corte',
  cortado:    'Cortado',
  em_revisao: 'Em Revisão',
  aprovado:   'Aprovado',
  cancelado:  'Cancelado',
  enviado:    'Enviado',
  em_producao:'Em Produção',
  retornado:  'Retornado',
  pago:       'Pago',
}
