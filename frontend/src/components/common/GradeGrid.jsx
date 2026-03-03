/**
 * GradeGrid — Grid de tamanhos PP/P/M/G/GG/XGG para entrada de quantidades
 *
 * Usa chaves internas pp, p, m, g, gg, xgg.
 * O componente pai é responsável por mapear para os nomes de coluna do banco.
 */
import { styled } from '@/styles/stitches.config'

const SIZES = ['pp', 'p', 'm', 'g', 'gg', 'xgg']
const SIZE_LABELS = { pp: 'PP', p: 'P', m: 'M', g: 'G', gg: 'GG', xgg: 'XGG' }

const Wrapper = styled('div', {})

const WrapperLabel = styled('div', {
  fontSize: '$sm',
  fontWeight: '$medium',
  color: '$textPrimary',
  marginBottom: '$2',
})

const Grid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gap: '$2',
})

const SizeCell = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '$1',
})

const SizeLabel = styled('span', {
  fontSize: '$xs',
  fontWeight: '$medium',
  color: '$textSecondary',
  textTransform: 'uppercase',
})

const SizeInput = styled('input', {
  width: '100%',
  textAlign: 'center',
  px: '$1',
  py: '$2',
  fontSize: '$sm',
  border: '1px solid $border',
  borderRadius: '$md',
  outline: 'none',
  backgroundColor: '$surface',
  color: '$textPrimary',
  transition: 'border-color $fast, box-shadow $fast',
  MozAppearance: 'textfield',

  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },

  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 2px $colors$primary100',
  },

  '&:disabled': {
    backgroundColor: '$gray50',
    cursor: 'not-allowed',
    color: '$textSecondary',
  },
})

const TotalRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '$2',
  marginTop: '$2',
  fontSize: '$sm',
  color: '$textSecondary',

  '& strong': {
    color: '$textPrimary',
    fontWeight: '$semibold',
  },
})

export function GradeGrid({ values = {}, onChange, readOnly = false, label, maxValues }) {
  const total = SIZES.reduce((sum, s) => sum + (Number(values[s]) || 0), 0)

  function handleChange(size, raw) {
    let num = Math.max(0, parseInt(raw, 10) || 0)
    if (maxValues && maxValues[size] !== undefined) {
      num = Math.min(num, maxValues[size])
    }
    onChange?.({ ...values, [size]: num })
  }

  return (
    <Wrapper>
      {label && <WrapperLabel>{label}</WrapperLabel>}
      <Grid>
        {SIZES.map((size) => (
          <SizeCell key={size}>
            <SizeLabel>{SIZE_LABELS[size]}</SizeLabel>
            <SizeInput
              type="number"
              min={0}
              max={maxValues?.[size] ?? undefined}
              value={values[size] ?? 0}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(e) => handleChange(size, e.target.value)}
            />
          </SizeCell>
        ))}
      </Grid>
      <TotalRow>Total: <strong>{total} peças</strong></TotalRow>
    </Wrapper>
  )
}

/** Helper para formatar grade em string "PP:5 P:10 M:20" (apenas > 0) */
export function formatGradeString(obj, prefix = 'qty_') {
  return SIZES
    .filter(s => (obj[`${prefix}${s}`] || 0) > 0)
    .map(s => `${SIZE_LABELS[s]}:${obj[`${prefix}${s}`]}`)
    .join(' ') || '—'
}

/** Helper para extrair valores de grade de um objeto com prefixo de coluna */
export function extractGrade(obj, prefix = 'qty_') {
  return Object.fromEntries(SIZES.map(s => [s, obj[`${prefix}${s}`] || 0]))
}

/** Helper para expandir grade com prefixo de coluna */
export function expandGrade(grade, prefix = 'qty_') {
  return Object.fromEntries(SIZES.map(s => [`${prefix}${s}`, grade[s] || 0]))
}
