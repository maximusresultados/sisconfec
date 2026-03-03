/**
 * Input — Campo de formulário estilizado reutilizável
 */
import { styled } from '@/styles/stitches.config'

const FormGroup = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$1',
})

const Label = styled('label', {
  fontSize: '$sm',
  fontWeight: '$medium',
  color: '$textPrimary',
})

const StyledInput = styled('input', {
  width: '100%',
  px: '$3',
  py: '$2',
  fontSize: '$sm',
  border: '1px solid $border',
  borderRadius: '$md',
  outline: 'none',
  backgroundColor: '$surface',
  color: '$textPrimary',
  transition: 'border-color $fast, box-shadow $fast',

  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 3px $colors$primary100',
  },

  '&::placeholder': {
    color: '$textDisabled',
  },

  '&:disabled': {
    backgroundColor: '$gray50',
    cursor: 'not-allowed',
    color: '$textSecondary',
  },

  variants: {
    hasError: {
      true: {
        borderColor: '$danger500',
        '&:focus': {
          borderColor: '$danger500',
          boxShadow: '0 0 0 3px $colors$danger50',
        },
      },
    },
  },
})

const ErrorText = styled('span', {
  fontSize: '$xs',
  color: '$danger500',
})

const HintText = styled('span', {
  fontSize: '$xs',
  color: '$textSecondary',
})

export function Input({ label, error, hint, id, ...props }) {
  return (
    <FormGroup>
      {label && <Label htmlFor={id}>{label}</Label>}
      <StyledInput id={id} hasError={!!error} {...props} />
      {error && <ErrorText>{error}</ErrorText>}
      {hint && !error && <HintText>{hint}</HintText>}
    </FormGroup>
  )
}
