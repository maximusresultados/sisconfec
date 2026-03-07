/**
 * PaymentHistory — Histórico de pagamentos de facção por costureira
 *
 * Lista todas as remessas pagas, com filtros por costureira e período,
 * KPIs de resumo e exportação CSV.
 */
import { useEffect, useState, useCallback } from 'react'
import { Download, RefreshCw, Search } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { translateError } from '@/lib/errorMessages'
import { useExport } from '@/hooks/useExport'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { SkeletonTable, SkeletonKpi } from '@/components/common/Skeleton'
import { Pagination, usePagination } from '@/components/common/Pagination'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: '$6', flexWrap: 'wrap', gap: '$3',
})
const PageTitle = styled('h2', { fontSize: '$2xl', fontWeight: '$bold', color: '$textPrimary' })

const Toolbar = styled('div', {
  display: 'flex', gap: '$3', alignItems: 'flex-end', marginBottom: '$4', flexWrap: 'wrap',
})

const KpiGrid = styled('div', {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '$4', marginBottom: '$6',
})

const KpiCard = styled('div', {
  backgroundColor: '$surface', border: '1px solid $border',
  borderRadius: '$xl', padding: '$4', boxShadow: '$sm',
})

const KpiLabel = styled('p', {
  fontSize: '$xs', fontWeight: '$medium', color: '$textSecondary',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '$1',
})
const KpiValue = styled('p', { fontSize: '$xl', fontWeight: '$bold', color: '$textPrimary' })

const Table = styled('table', {
  width: '100%', borderCollapse: 'collapse', fontSize: '$sm',
  th: {
    textAlign: 'left', py: '$3', px: '$4', color: '$textSecondary', fontWeight: '$medium',
    borderBottom: '1px solid $border', fontSize: '$xs', textTransform: 'uppercase', letterSpacing: '0.04em',
    backgroundColor: '$gray50',
  },
  td: { py: '$3', px: '$4', borderBottom: '1px solid $border', color: '$textPrimary', verticalAlign: 'middle' },
  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})

const MonoCell = styled('td', { fontVariantNumeric: 'tabular-nums', fontSize: '$sm' })

const EmptyState = styled('div', {
  textAlign: 'center', py: '$12', color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const PAGE_SIZE = 30

// ------- COMPONENTE -------
export default function PaymentHistory() {
  const { profile } = useAuth()
  const tenantId    = profile?.tenant_id
  const toast       = useToast()
  const { exportCSV } = useExport()

  const [payments,  setPayments]  = useState([])
  const [seamstresses, setSeamstresses] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filterSeamstress, setFilterSeamstress] = useState('')
  const [filterDateFrom,   setFilterDateFrom]   = useState('')
  const [filterDateTo,     setFilterDateTo]     = useState('')
  const [search,    setSearch]    = useState('')

  const pagination = usePagination(
    payments.filter(p => {
      if (!search) return true
      const term = search.toLowerCase()
      return (
        p.dispatch_number?.toLowerCase().includes(term) ||
        p.seamstress?.name?.toLowerCase().includes(term)
      )
    }),
    PAGE_SIZE
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('faction_dispatches')
        .select(`
          id, dispatch_number, payment_value, payment_date, payment_notes,
          payment_status, total_sent, total_returned, status, dispatched_at,
          seamstress:seamstresses(id, name, price_per_piece)
        `)
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'pago')
        .order('payment_date', { ascending: false })

      if (filterSeamstress) query = query.eq('seamstress_id', filterSeamstress)
      if (filterDateFrom)   query = query.gte('payment_date', filterDateFrom)
      if (filterDateTo)     query = query.lte('payment_date', filterDateTo)

      const { data, error } = await query
      if (error) throw error
      setPayments(data ?? [])
    } catch (err) {
      toast?.error('Erro ao carregar pagamentos: ' + translateError(err))
    } finally {
      setLoading(false)
    }
  }, [tenantId, filterSeamstress, filterDateFrom, filterDateTo, toast])

  // Carrega costureiras para o filtro
  useEffect(() => {
    supabase.from('seamstresses')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setSeamstresses(data ?? []))
  }, [tenantId])

  useEffect(() => { loadData() }, [loadData])

  // KPIs
  const totalPago     = payments.reduce((a, p) => a + (Number(p.payment_value) || 0), 0)
  const totalPecas    = payments.reduce((a, p) => a + (Number(p.total_returned) || 0), 0)
  const mediaTicket   = payments.length > 0 ? totalPago / payments.length : 0

  function handleExport() {
    exportCSV('historico-pagamentos.csv', [
      { key: 'dispatch_number',  label: 'Nº Remessa'          },
      { key: 'seamstress',       label: 'Costureira',          format: (_, r) => r.seamstress?.name ?? '—' },
      { key: 'payment_date',     label: 'Data Pagto',          format: v => v ? new Date(v).toLocaleDateString('pt-BR') : '—' },
      { key: 'total_sent',       label: 'Peças Enviadas',      format: v => Number(v || 0) },
      { key: 'total_returned',   label: 'Peças Retornadas',    format: v => Number(v || 0) },
      { key: 'payment_value',    label: 'Valor Pago (R$)',      format: v => Number(v || 0).toFixed(2) },
      { key: 'payment_notes',    label: 'Observações'          },
    ], payments)
    toast?.success('Histórico de pagamentos exportado.')
  }

  const seamstressOptions = [
    { value: '', label: 'Todas as costureiras' },
    ...seamstresses.map(s => ({ value: s.id, label: s.name })),
  ]

  const filteredForTable = pagination.paginated

  return (
    <div>
      <PageHeader>
        <PageTitle>Histórico de Pagamentos</PageTitle>
        {payments.length > 0 && (
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} /> Exportar CSV
          </Button>
        )}
      </PageHeader>

      {/* Filtros */}
      <Toolbar>
        <div style={{ minWidth: '220px' }}>
          <Select
            id="filter_seamstress"
            label="Costureira"
            value={filterSeamstress}
            onChange={e => setFilterSeamstress(e.target.value)}
            options={seamstressOptions}
          />
        </div>
        <div style={{ minWidth: '150px' }}>
          <Input id="f_from" label="Pagto de" type="date" value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)} />
        </div>
        <div style={{ minWidth: '150px' }}>
          <Input id="f_to" label="Pagto até" type="date" value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)} />
        </div>
        <Button onClick={loadData} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          <RefreshCw size={14} /> Filtrar
        </Button>
      </Toolbar>

      {/* KPIs */}
      {loading ? (
        <div style={{ marginBottom: 24 }}><SkeletonKpi count={3} /></div>
      ) : (
        <KpiGrid>
          <KpiCard>
            <KpiLabel>Total Pago</KpiLabel>
            <KpiValue>R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</KpiValue>
          </KpiCard>
          <KpiCard>
            <KpiLabel>Peças Liquidadas</KpiLabel>
            <KpiValue>{totalPecas.toLocaleString('pt-BR')}</KpiValue>
          </KpiCard>
          <KpiCard>
            <KpiLabel>Nº de Remessas</KpiLabel>
            <KpiValue>{payments.length}</KpiValue>
          </KpiCard>
          <KpiCard>
            <KpiLabel>Ticket Médio / Remessa</KpiLabel>
            <KpiValue>R$ {mediaTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</KpiValue>
          </KpiCard>
        </KpiGrid>
      )}

      {/* Busca inline */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: '0.875rem', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', background: 'var(--colors-surface, #fff)', color: 'var(--colors-textPrimary, #111827)' }}
            placeholder="Busca"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <Card padding="none">
        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : pagination.total === 0 ? (
            <EmptyState>
              <p>Nenhum pagamento encontrado para os filtros selecionados.</p>
            </EmptyState>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <th>Nº Remessa</th>
                    <th>Costureira</th>
                    <th>Data Envio</th>
                    <th>Data Pagto</th>
                    <th>Peças Retornadas</th>
                    <th>Valor Pago (R$)</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForTable.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.dispatch_number}</strong></td>
                      <td>{p.seamstress?.name ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {p.dispatched_at ? new Date(p.dispatched_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <MonoCell>{Number(p.total_returned || 0).toLocaleString('pt-BR')}</MonoCell>
                      <MonoCell>
                        <span style={{ fontWeight: 600, color: '#15803d' }}>
                          R$ {Number(p.payment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </MonoCell>
                      <td style={{ color: '#6b7280', fontSize: '0.8125rem' }}>
                        {p.payment_notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={pagination.page}
                pageSize={PAGE_SIZE}
                total={pagination.total}
                onPageChange={pagination.setPage}
              />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
