/**
 * Reports — Kardex, Estoque Mínimo e Resumo de Facção
 */
import { useEffect, useState } from 'react'
import { Printer, Search, Filter } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useInventory } from '@/hooks/useInventory'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Select } from '@/components/common/Select'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '$6',
})

const PageTitle = styled('h2', {
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: '$textPrimary',
})

const TabBar = styled('div', {
  display: 'flex',
  gap: 0,
  borderBottom: '2px solid $border',
  marginBottom: '$6',
})

const Tab = styled('button', {
  px: '$5',
  py: '$3',
  fontSize: '$sm',
  fontWeight: '$medium',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  color: '$textSecondary',
  borderBottom: '2px solid transparent',
  marginBottom: '-2px',
  transition: 'color $fast, border-color $fast',

  '&:hover': { color: '$textPrimary' },

  variants: {
    active: {
      true: {
        color: '$primary600',
        borderBottomColor: '$primary600',
      },
    },
  },
})

const Toolbar = styled('div', {
  display: 'flex',
  gap: '$3',
  alignItems: 'flex-end',
  marginBottom: '$4',
  flexWrap: 'wrap',
})

const Table = styled('table', {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '$sm',

  th: {
    textAlign: 'left',
    py: '$3',
    px: '$4',
    color: '$textSecondary',
    fontWeight: '$medium',
    borderBottom: '1px solid $border',
    fontSize: '$xs',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    backgroundColor: '$gray50',
  },

  td: {
    py: '$3',
    px: '$4',
    borderBottom: '1px solid $border',
    color: '$textPrimary',
    verticalAlign: 'middle',
  },

  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})

const MonoCell = styled('td', {
  fontVariantNumeric: 'tabular-nums',
  fontFamily: '$mono',
  fontSize: '$xs',
})

const EmptyState = styled('div', {
  textAlign: 'center',
  py: '$12',
  color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const KpiGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '$4',
  marginBottom: '$6',
})

const KpiCard = styled('div', {
  backgroundColor: '$surface',
  border: '1px solid $border',
  borderRadius: '$xl',
  padding: '$4',
  boxShadow: '$sm',
})

const KpiLabel = styled('p', {
  fontSize: '$xs',
  fontWeight: '$medium',
  color: '$textSecondary',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '$1',
})

const KpiValue = styled('p', {
  fontSize: '$xl',
  fontWeight: '$bold',
  color: '$textPrimary',
})

const TypeBadgeMap = {
  entrada: 'success',
  saida:   'danger',
}

const TypeLabelMap = {
  entrada: 'Entrada',
  saida:   'Saída',
}

// ------- COMPONENTE -------
export default function Reports() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id
  const { fetchFabrics, fetchKardex } = useInventory()

  const [activeTab, setActiveTab] = useState('kardex')

  // --- Kardex ---
  const [fabrics,       setFabrics]       = useState([])
  const [selectedFabric, setSelectedFabric] = useState('')
  const [kardex,        setKardex]        = useState([])
  const [loadingKardex, setLoadingKardex] = useState(false)

  // --- Estoque Mínimo ---
  const [lowStock,       setLowStock]       = useState([])
  const [loadingLowStock, setLoadingLowStock] = useState(false)

  // --- Resumo Facção ---
  const [factionSummary,       setFactionSummary]       = useState([])
  const [loadingFaction, setLoadingFaction] = useState(false)

  useEffect(() => {
    fetchFabrics().then(setFabrics)
  }, [])

  useEffect(() => {
    if (activeTab === 'estoque_minimo' && lowStock.length === 0) loadLowStock()
    if (activeTab === 'faccao' && factionSummary.length === 0) loadFactionSummary()
  }, [activeTab])

  async function handleFetchKardex() {
    if (!selectedFabric) return
    setLoadingKardex(true)
    try {
      const data = await fetchKardex(selectedFabric, { limit: 200 })
      setKardex(data)
    } finally {
      setLoadingKardex(false)
    }
  }

  async function loadLowStock() {
    setLoadingLowStock(true)
    try {
      const { data } = await supabase
        .from('vw_low_stock_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('deficit', { ascending: false })
      setLowStock(data ?? [])
    } finally {
      setLoadingLowStock(false)
    }
  }

  async function loadFactionSummary() {
    setLoadingFaction(true)
    try {
      const { data } = await supabase
        .from('vw_faction_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('seamstress_name')
      setFactionSummary(data ?? [])
    } finally {
      setLoadingFaction(false)
    }
  }

  const fabricOptions = fabrics.map(f => ({
    value: f.id,
    label: `${f.code} — ${f.description}${f.color ? ` (${f.color})` : ''}`,
  }))

  // KPIs de facção
  const kpiTotalSent     = factionSummary.reduce((a, s) => a + (Number(s.total_sent)      || 0), 0)
  const kpiTotalReturned = factionSummary.reduce((a, s) => a + (Number(s.total_returned)  || 0), 0)
  const kpiBalance       = kpiTotalSent - kpiTotalReturned
  const kpiPending       = factionSummary.reduce((a, s) => a + (Number(s.pending_payment) || 0), 0)

  return (
    <div>
      <PageHeader>
        <PageTitle>Relatórios</PageTitle>
        {activeTab === 'kardex' && kardex.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir Kardex
          </Button>
        )}
      </PageHeader>

      {/* Abas */}
      <TabBar>
        <Tab active={activeTab === 'kardex'}         onClick={() => setActiveTab('kardex')}>
          Kardex
        </Tab>
        <Tab active={activeTab === 'estoque_minimo'} onClick={() => setActiveTab('estoque_minimo')}>
          Estoque Mínimo
        </Tab>
        <Tab active={activeTab === 'faccao'}         onClick={() => setActiveTab('faccao')}>
          Resumo de Facção
        </Tab>
      </TabBar>

      {/* ======== ABA KARDEX ======== */}
      {activeTab === 'kardex' && (
        <div>
          <Toolbar>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <Select
                label="Tecido"
                id="fabric_select"
                value={selectedFabric}
                onChange={e => setSelectedFabric(e.target.value)}
                options={fabricOptions}
                placeholder="Selecione um tecido..."
              />
            </div>
            <Button onClick={handleFetchKardex} disabled={!selectedFabric || loadingKardex}>
              <Filter size={14} />
              {loadingKardex ? 'Carregando...' : 'Filtrar'}
            </Button>
          </Toolbar>

          {kardex.length === 0 && !loadingKardex ? (
            <EmptyState>
              <p>{selectedFabric ? 'Nenhuma movimentação encontrada.' : 'Selecione um tecido para visualizar o Kardex.'}</p>
            </EmptyState>
          ) : (
            <Card padding="none">
              <CardBody css={{ px: 0, pb: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Qtd</th>
                      <th>Custo Unit.</th>
                      <th>Total</th>
                      <th>Estoque Antes</th>
                      <th>Estoque Depois</th>
                      <th>PM Antes</th>
                      <th>PM Depois</th>
                      <th>Referência</th>
                      <th>Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardex.map((row, i) => (
                      <tr key={row.id ?? i}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {row.created_at
                            ? new Date(row.created_at).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td>
                          <Badge color={TypeBadgeMap[row.transaction_type] ?? 'default'}>
                            {TypeLabelMap[row.transaction_type] ?? row.transaction_type}
                          </Badge>
                        </td>
                        <MonoCell>{Number(row.quantity).toFixed(2)}</MonoCell>
                        <MonoCell>
                          R$ {Number(row.unit_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                        </MonoCell>
                        <MonoCell>
                          R$ {Number(row.total_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </MonoCell>
                        <MonoCell>{Number(row.stock_before ?? 0).toFixed(2)}</MonoCell>
                        <MonoCell>{Number(row.stock_after ?? 0).toFixed(2)}</MonoCell>
                        <MonoCell>
                          R$ {Number(row.avg_price_before ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                        </MonoCell>
                        <MonoCell>
                          R$ {Number(row.avg_price_after ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                        </MonoCell>
                        <td>{row.reference_doc ?? '—'}</td>
                        <td>{row.user_name ?? row.created_by ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ======== ABA ESTOQUE MÍNIMO ======== */}
      {activeTab === 'estoque_minimo' && (
        <div>
          {loadingLowStock ? (
            <EmptyState><p>Carregando alertas...</p></EmptyState>
          ) : lowStock.length === 0 ? (
            <EmptyState>
              <p>Nenhum tecido abaixo do estoque mínimo.</p>
            </EmptyState>
          ) : (
            <Card padding="none">
              <CardBody css={{ px: 0, pb: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Cor</th>
                      <th>Fornecedor</th>
                      <th>Estoque Atual</th>
                      <th>Estoque Mínimo</th>
                      <th>Déficit</th>
                      <th>Custo Médio</th>
                      <th>Valor em Risco</th>
                      <th>Urgência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((row, i) => {
                      const deficit = Number(row.deficit ?? 0)
                      const minStock = Number(row.minimum_stock ?? 0)
                      const deficitPct = minStock > 0 ? (deficit / minStock) * 100 : 0
                      const urgency = deficitPct > 50 ? 'danger' : 'warning'
                      return (
                        <tr key={row.id ?? i}>
                          <td><strong>{row.code}</strong></td>
                          <td>{row.description}</td>
                          <td>{row.color ?? '—'}</td>
                          <td>{row.supplier ?? '—'}</td>
                          <MonoCell>{Number(row.current_stock).toFixed(2)}</MonoCell>
                          <MonoCell>{Number(row.minimum_stock).toFixed(2)}</MonoCell>
                          <MonoCell style={{ color: '#b91c1c', fontWeight: 600 }}>
                            {deficit.toFixed(2)}
                          </MonoCell>
                          <MonoCell>
                            R$ {Number(row.average_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                          </MonoCell>
                          <MonoCell>
                            R$ {Number(row.value_at_risk ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </MonoCell>
                          <td>
                            <Badge color={urgency}>
                              {deficitPct > 50 ? 'Crítico' : 'Baixo'}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ======== ABA RESUMO DE FACÇÃO ======== */}
      {activeTab === 'faccao' && (
        <div>
          <KpiGrid>
            <KpiCard>
              <KpiLabel>Total Enviado</KpiLabel>
              <KpiValue>{kpiTotalSent.toLocaleString('pt-BR')} pç</KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Total Retornado</KpiLabel>
              <KpiValue>{kpiTotalReturned.toLocaleString('pt-BR')} pç</KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Saldo em Campo</KpiLabel>
              <KpiValue style={{ color: kpiBalance > 0 ? '#b45309' : '#15803d' }}>
                {kpiBalance.toLocaleString('pt-BR')} pç
              </KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Valor Pendente</KpiLabel>
              <KpiValue>
                R$ {kpiPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </KpiValue>
            </KpiCard>
          </KpiGrid>

          {loadingFaction ? (
            <EmptyState><p>Carregando resumo...</p></EmptyState>
          ) : factionSummary.length === 0 ? (
            <EmptyState><p>Nenhuma costureira com remessas registradas.</p></EmptyState>
          ) : (
            <Card padding="none">
              <CardBody css={{ px: 0, pb: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Costureira</th>
                      <th>Total Remessas</th>
                      <th>Peças Enviadas</th>
                      <th>Peças Retornadas</th>
                      <th>% Retorno</th>
                      <th>A Pagar (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factionSummary.map((row, i) => {
                      const sent     = Number(row.total_sent) || 0
                      const returned = Number(row.total_returned) || 0
                      const pct      = sent > 0 ? ((returned / sent) * 100).toFixed(1) : '—'
                      return (
                        <tr key={row.seamstress_id ?? i}>
                          <td><strong>{row.seamstress_name ?? row.name ?? '—'}</strong></td>
                          <td>{row.total_dispatches ?? 0}</td>
                          <MonoCell>{sent.toLocaleString('pt-BR')}</MonoCell>
                          <MonoCell>{returned.toLocaleString('pt-BR')}</MonoCell>
                          <td>
                            {pct !== '—' ? (
                              <Badge color={Number(pct) >= 90 ? 'success' : Number(pct) >= 70 ? 'warning' : 'danger'}>
                                {pct}%
                              </Badge>
                            ) : '—'}
                          </td>
                          <MonoCell>
                            {row.pending_payment != null
                              ? `R$ ${Number(row.pending_payment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </MonoCell>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
