/**
 * ActivityLog — Histórico de atividades / Auditoria do tenant
 */
import { useEffect, useState, useCallback } from 'react'
import { Activity, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { translateError } from '@/lib/errorMessages'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { SkeletonTable } from '@/components/common/Skeleton'
import { Pagination, usePagination } from '@/components/common/Pagination'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '$6',
})
const PageTitle = styled('h2', { fontSize: '$2xl', fontWeight: '$bold', color: '$textPrimary' })

const Toolbar = styled('div', {
  display: 'flex', gap: '$3', alignItems: 'flex-end', mb: '$4', flexWrap: 'wrap',
})

const Table = styled('table', {
  width: '100%', borderCollapse: 'collapse', fontSize: '$sm',
  th: {
    textAlign: 'left', py: '$3', px: '$4', color: '$textSecondary', fontWeight: '$medium',
    borderBottom: '1px solid $border', fontSize: '$xs', textTransform: 'uppercase',
    letterSpacing: '0.04em', backgroundColor: '$gray50', whiteSpace: 'nowrap',
  },
  td: { py: '$3', px: '$4', borderBottom: '1px solid $border', color: '$textPrimary', verticalAlign: 'middle' },
  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})

const EmptyState = styled('div', {
  textAlign: 'center', py: '$12', color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const JsonBlock = styled('pre', {
  fontSize: '0.75rem',
  backgroundColor: '$gray50',
  border: '1px solid $border',
  borderRadius: '$md',
  padding: '$3',
  overflowX: 'auto',
  maxHeight: '300px',
  overflowY: 'auto',
  color: '$textPrimary',
  lineHeight: 1.5,
})

// ------- MAPEAMENTOS -------
const ACTION_COLOR = { INSERT: 'success', UPDATE: 'warning', DELETE: 'danger' }
const ACTION_LABEL = { INSERT: 'Criação', UPDATE: 'Edição', DELETE: 'Remoção' }

const TABLE_LABEL = {
  cutting_orders:          'Ordens de Corte',
  cutting_executions:      'Execuções de Corte',
  faction_dispatches:      'Remessas Facção',
  inventory_transactions:  'Movimentações Estoque',
  technical_sheets:        'Fichas Técnicas',
}

const TABLE_OPTIONS = [
  { value: '', label: 'Todas as tabelas' },
  ...Object.entries(TABLE_LABEL).map(([value, label]) => ({ value, label })),
]

const ACTION_OPTIONS = [
  { value: '',       label: 'Todas as ações' },
  { value: 'INSERT', label: 'Criação'  },
  { value: 'UPDATE', label: 'Edição'   },
  { value: 'DELETE', label: 'Remoção'  },
]

const PAGE_SIZE = 50

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function shortenId(id) {
  return id ? id.slice(0, 8) + '…' : '—'
}

// ------- COMPONENTE LINHA EXPANDÍVEL -------
function LogRow({ entry, onDetails }) {
  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
        {formatDate(entry.created_at)}
      </td>
      <td>{entry.user_name ?? <span style={{ color: '#9ca3af' }}>Sistema</span>}</td>
      <td>
        <Badge color={ACTION_COLOR[entry.action] ?? 'default'}>
          {ACTION_LABEL[entry.action] ?? entry.action}
        </Badge>
      </td>
      <td>{TABLE_LABEL[entry.table_name] ?? entry.table_name}</td>
      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>
        {shortenId(entry.record_id)}
      </td>
      <td>
        <Button variant="ghost" size="xs" onClick={() => onDetails(entry)}>
          Ver detalhes
        </Button>
      </td>
    </tr>
  )
}

// ------- COMPONENTE PRINCIPAL -------
export default function ActivityLog() {
  const { profile } = useAuth()
  const toast = useToast()

  const [logs,        setLogs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [detailEntry, setDetailEntry] = useState(null)

  // Filtros
  const [filterTable,  setFilterTable]  = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterUser,   setFilterUser]   = useState('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  const pagination = usePagination(logs, PAGE_SIZE)

  const loadLogs = useCallback(async () => {
    if (!profile?.tenant_id) return
    setLoading(true)
    try {
      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(2000)

      if (filterTable)  query = query.eq('table_name', filterTable)
      if (filterAction) query = query.eq('action', filterAction)
      if (filterUser)   query = query.ilike('user_name', `%${filterUser}%`)
      if (dateFrom)     query = query.gte('created_at', dateFrom)
      if (dateTo)       query = query.lte('created_at', dateTo + 'T23:59:59')

      const { data, error } = await query
      if (error) throw error
      setLogs(data ?? [])
    } catch (err) {
      toast?.error('Erro ao carregar log: ' + translateError(err))
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id, filterTable, filterAction, filterUser, dateFrom, dateTo, toast])

  useEffect(() => { loadLogs() }, [profile?.tenant_id])

  function handleFilter(e) {
    e.preventDefault()
    loadLogs()
  }

  return (
    <div>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={22} style={{ color: '#2563eb' }} />
          <PageTitle>Histórico de Atividades</PageTitle>
        </div>
        <Button variant="secondary" size="sm" onClick={loadLogs} disabled={loading}>
          <RefreshCw size={14} /> Atualizar
        </Button>
      </PageHeader>

      {/* Filtros */}
      <Card css={{ mb: '$4' }}>
        <CardBody>
          <form onSubmit={handleFilter}>
            <Toolbar>
              <div style={{ minWidth: '200px' }}>
                <Select
                  id="filter_table"
                  label="Tabela"
                  value={filterTable}
                  onChange={e => setFilterTable(e.target.value)}
                  options={TABLE_OPTIONS}
                />
              </div>
              <div style={{ minWidth: '160px' }}>
                <Select
                  id="filter_action"
                  label="Ação"
                  value={filterAction}
                  onChange={e => setFilterAction(e.target.value)}
                  options={ACTION_OPTIONS}
                />
              </div>
              <div style={{ minWidth: '180px' }}>
                <Input
                  id="filter_user"
                  label="Usuário"
                  placeholder="Nome do usuário..."
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <Input
                  id="date_from"
                  label="Data inicial"
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <Input
                  id="date_to"
                  label="Data final"
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} style={{ alignSelf: 'flex-end' }}>
                <Filter size={14} /> Filtrar
              </Button>
            </Toolbar>
          </form>
        </CardBody>
      </Card>

      {/* Tabela */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>
            {loading ? 'Carregando...' : `${logs.length.toLocaleString('pt-BR')} registro${logs.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : logs.length === 0 ? (
            <EmptyState><p>Nenhum registro encontrado para os filtros aplicados.</p></EmptyState>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Usuário</th>
                    <th>Ação</th>
                    <th>Módulo</th>
                    <th>Registro</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginated.map(entry => (
                    <LogRow key={entry.id} entry={entry} onDetails={setDetailEntry} />
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

      {/* Modal de detalhes */}
      {detailEntry && (
        <Modal
          open={!!detailEntry}
          onClose={() => setDetailEntry(null)}
          title={`Detalhes — ${ACTION_LABEL[detailEntry.action] ?? detailEntry.action} em ${TABLE_LABEL[detailEntry.table_name] ?? detailEntry.table_name}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>DATA / HORA</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{formatDate(detailEntry.created_at)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>USUÁRIO</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{detailEntry.user_name ?? 'Sistema'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>AÇÃO</p>
                <Badge color={ACTION_COLOR[detailEntry.action] ?? 'default'}>
                  {ACTION_LABEL[detailEntry.action] ?? detailEntry.action}
                </Badge>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>ID DO REGISTRO</p>
                <p style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: '#6b7280' }}>
                  {detailEntry.record_id ?? '—'}
                </p>
              </div>
            </div>

            {detailEntry.old_data && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Dados anteriores
                </p>
                <JsonBlock>{JSON.stringify(detailEntry.old_data, null, 2)}</JsonBlock>
              </div>
            )}

            {detailEntry.new_data && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {detailEntry.action === 'INSERT' ? 'Dados criados' : 'Dados novos'}
                </p>
                <JsonBlock>{JSON.stringify(detailEntry.new_data, null, 2)}</JsonBlock>
              </div>
            )}
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setDetailEntry(null)}>Fechar</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
