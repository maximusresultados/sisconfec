/**
 * Pagination — Navegação paginada reutilizável
 *
 * Uso:
 *   <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
 *
 * Hook helper:
 *   const { page, setPage, paginated } = usePagination(items, 20)
 */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { styled } from '@/styles/stitches.config'

const Wrap = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: '$4',
  py: '$3',
  borderTop: '1px solid $border',
  fontSize: '$sm',
  color: '$textSecondary',
})

const Pages = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '$1',
})

const PageBtn = styled('button', {
  size: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$md',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  fontSize: '$sm',
  fontWeight: '$medium',
  color: '$textSecondary',
  transition: 'background-color $fast, color $fast',

  '&:hover:not(:disabled)': {
    backgroundColor: '$gray100',
    color: '$textPrimary',
  },

  '&:disabled': {
    opacity: 0.35,
    cursor: 'not-allowed',
  },

  variants: {
    active: {
      true: {
        backgroundColor: '$primary600',
        color: '$textInverse',
        '&:hover': { backgroundColor: '$primary700' },
      },
    },
  },
})

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
}

export function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start      = Math.min((page - 1) * pageSize + 1, total)
  const end        = Math.min(page * pageSize, total)
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages])

  if (total === 0) return null

  return (
    <Wrap>
      <span>
        {total > 0
          ? `Exibindo ${start}–${end} de ${total} registros`
          : 'Nenhum registro'}
      </span>

      <Pages>
        <PageBtn
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </PageBtn>

        {pageNumbers.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>
            : (
              <PageBtn
                key={p}
                active={p === page}
                onClick={() => onPageChange(p)}
              >
                {p}
              </PageBtn>
            )
        )}

        <PageBtn
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight size={16} />
        </PageBtn>
      </Pages>
    </Wrap>
  )
}

/** Hook para paginação client-side de arrays */
export function usePagination(items, pageSize = 20) {
  const [page, setPage] = useState(1)

  const paginated = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  )

  // Reset para página 1 quando o total de items muda significativamente
  useMemo(() => { setPage(1) }, [items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return { page, setPage, paginated, total: items.length }
}
