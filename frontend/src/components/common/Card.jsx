/**
 * Card — Componente de cartão de conteúdo (Stitches)
 */
import { styled } from '@/styles/stitches.config'

export const Card = styled('div', {
  backgroundColor: '$surface',
  borderRadius: '$xl',
  border: '1px solid $border',
  boxShadow: '$sm',

  variants: {
    padding: {
      none:   { padding: 0 },
      sm:     { padding: '$4' },
      md:     { padding: '$6' },
      lg:     { padding: '$8' },
    },
    hoverable: {
      true: {
        transition: 'box-shadow $normal, transform $normal',
        '&:hover': {
          boxShadow: '$md',
          transform: 'translateY(-1px)',
        },
      },
    },
  },

  defaultVariants: {
    padding: 'md',
  },
})

// Cabeçalho do card
export const CardHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: '$4',
  borderBottom: '1px solid $border',
  marginBottom: '$4',
})

export const CardTitle = styled('h3', {
  fontSize: '$lg',
  fontWeight: '$semibold',
  color: '$textPrimary',
})

export const CardBody = styled('div', {
  // slot de conteúdo — sem estilos forçados
})
