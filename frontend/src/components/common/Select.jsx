/**
 * Select — Campo de seleção estilizado reutilizável
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

const StyledSelect = styled('select', {
  width: '100%',
  px: '$3',
  py: '$2',
  paddingRight: '$8',
  fontSize: '$sm',
  border: '1px solid $border',
  borderRadius: '$md',
  outline: 'none',
  backgroundColor: '$surface',
  color: '$textPrimary',
  transition: 'border-color $fast, box-shadow $fast',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',

  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 3px $colors$primary100',
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

export function Select({ label, error, options = [], id, placeholder, ...props }) {
  return (
    <FormGroup>
      {label && <Label htmlFor={id}>{label}</Label>}
      <StyledSelect id={id} hasError={!!error} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </StyledSelect>
      {error && <ErrorText>{error}</ErrorText>}
    </FormGroup>
  )
}
