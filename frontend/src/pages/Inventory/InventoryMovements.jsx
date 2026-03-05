/**
 * InventoryMovements — Histórico de todas as movimentações de estoque (Kardex geral)
 */
import { useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'

// ------- ESTILOS -------
const PageTitle = styled('h2', {
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: '$textPrimary',
  marginBottom: '$6',
})

const TableWrap = styled('div', {
  width: '100%',
  overflowX: 'auto',
  borderRadius: '$xl',
})

const Table = styled('table', {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '$sm',
  whiteSpace: 'nowrap',

  th: {
    textAlign: 'left',
    py: '$2',
    px: '$3',
    color: '$textSecondary',
    fontWeight: '$medium',
    borderBottom: '2px solid $border',
    fontSize: '$xs',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    backgroundColor: '$gray50',
  },

  td: {
    py: '$2',
    px: '$3',
    borderBottom: '1px solid $border',
    color: '$textPrimary',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },

  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})

const NumCell = styled('td', {
  fontVariantNumeric: 'tabular-nums',
  fontSize: '$sm',
  whiteSpace: 'nowrap',
  py: '$2',
  px: '$3',
  borderBottom: '1px solid $border',
  color: '$textPrimary',
  verticalAlign: 'middle',
  'tr:last-child &': { borderBottom: 'none' },
})

const EmptyState = styled('div', {
  textAlign: 'center',
  py: '$12',
  color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

// ------- COMPONENTE -------
export default function InventoryMovements() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    load()
  }, [tenantId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('vw_kardex')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200)
    setRows(data ?? [])
    setLoading(false)
  }

  return (
    <div>
      <PageTitle>Movimentações de Estoque</PageTitle>

      <Card padding="none">
        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <EmptyState><p>Carregando movimentações...</p></EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState>
              <p>Nenhuma movimentação registrada.</p>
            </EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Código</th>
                    <th>Qtd</th>
                    <th>Custo Unit.</th>
                    <th>Total</th>
                    <th>Estq. Antes</th>
                    <th>Estq. Depois</th>
                    <th>PM Antes</th>
                    <th>PM Depois</th>
                    <th>Referência</th>
                    <th>Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id ?? i}>
                      <td>
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td>
                        <Badge color={row.type === 'entrada' ? 'success' : 'danger'}>
                          {row.type === 'entrada'
                            ? <><ArrowDownCircle size={11} /> Entrada</>
                            : <><ArrowUpCircle size={11} /> Saída</>}
                        </Badge>
                      </td>
                      <td><strong>{row.fabric_code}</strong></td>
                      <NumCell>{Number(row.quantity).toFixed(2)}</NumCell>
                      <NumCell>R$ {Number(row.unit_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</NumCell>
                      <NumCell>R$ {Number(row.total_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</NumCell>
                      <NumCell>{Number(row.stock_before ?? 0).toFixed(2)}</NumCell>
                      <NumCell>{Number(row.stock_after ?? 0).toFixed(2)}</NumCell>
                      <NumCell>R$ {Number(row.average_cost_before ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</NumCell>
                      <NumCell>R$ {Number(row.average_cost_after ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</NumCell>
                      <td style={{ color: '#6b7280' }}>{row.reference_doc ?? '—'}</td>
                      <td style={{ color: '#6b7280' }}>{row.created_by_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
