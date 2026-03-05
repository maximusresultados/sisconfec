/**
 * Skeleton — Placeholders animados de carregamento
 */
import { styled, keyframes } from '@/styles/stitches.config'

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%':      { opacity: 0.4 },
})

const Base = styled('div', {
  backgroundColor: '$gray200',
  borderRadius: '$md',
  animation: `${pulse} 1.6s ease-in-out infinite`,
})

export function Skeleton({ width = '100%', height = '1em', radius, style }) {
  return (
    <Base
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

/** Esqueleto de tabela para loading states */
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} style={{ padding: '12px 16px', backgroundColor: '#f9fafb' }}>
              <Skeleton height="12px" width="75%" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <Skeleton height="14px" width={c === 0 ? '45%' : c === cols - 1 ? '30%' : '70%'} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Esqueleto de cards KPI */
export function SkeletonKpi({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Skeleton width="48px" height="48px" radius="12px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton height="28px" width="60%" style={{ marginBottom: 8 }} />
            <Skeleton height="12px" width="80%" />
          </div>
        </div>
      ))}
    </div>
  )
}
