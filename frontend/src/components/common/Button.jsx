/**
 * Button — Componente base de botão com variantes Stitches
 */
import { styled } from '@/styles/stitches.config'

export const Button = styled('button', {
  // Base
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  borderRadius: '$md',
  fontWeight: '$medium',
  fontSize: '$sm',
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  transition: 'background-color $normal, box-shadow $normal, opacity $normal',
  userSelect: 'none',

  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  '&:focus-visible': {
    boxShadow: '0 0 0 3px $colors$primary200',
  },

  // ------- VARIANTES -------
  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary600',
        color: '$textInverse',
        '&:hover': { backgroundColor: '$primary700' },
        '&:active': { backgroundColor: '$primary900' },
      },
      secondary: {
        backgroundColor: '$gray100',
        color: '$textPrimary',
        '&:hover': { backgroundColor: '$gray200' },
        '&:active': { backgroundColor: '$gray300' },
      },
      outline: {
        backgroundColor: 'transparent',
        color: '$primary600',
        border: '1px solid $primary600',
        '&:hover': { backgroundColor: '$primary50' },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$textSecondary',
        '&:hover': { backgroundColor: '$gray100', color: '$textPrimary' },
      },
      danger: {
        backgroundColor: '$danger500',
        color: '$textInverse',
        '&:hover': { backgroundColor: '$danger700' },
      },
      success: {
        backgroundColor: '$success500',
        color: '$textInverse',
        '&:hover': { backgroundColor: '$success700' },
      },
    },

    size: {
      xs: { px: '$2', py: '$1',   fontSize: '$xs', height: '28px' },
      sm: { px: '$3', py: '$1',   fontSize: '$sm', height: '32px' },
      md: { px: '$4', py: '$2',   fontSize: '$sm', height: '40px' },
      lg: { px: '$6', py: '$3',   fontSize: '$base', height: '48px' },
    },

    fullWidth: {
      true: { width: '100%' },
    },
  },

  // ------- DEFAULTS -------
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})
