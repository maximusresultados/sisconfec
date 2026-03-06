/**
 * Dashboard — Painel em tempo real com período configurável e Realtime
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { Package, Scissors, Shirt, AlertTriangle, RefreshCw } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Badge, STATUS_COLOR_MAP, STATUS_LABEL_MAP } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { SkeletonKpi, SkeletonTable } from '@/components/common/Skeleton'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  mb: '$6',
  flexWrap: 'wrap',
  gap: '$3',
})

const PageTitle = styled('h2', {
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: '$textPrimary',
})

const KpiGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '$4',
  mb: '$6',
})

const KpiCard = styled(Card, {
  display: 'flex',
  alignItems: 'center',
  gap: '$4',
  padding: '$5',
})

const KpiIcon = styled('div', {
  size: '48px',
  borderRadius: '$lg',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  variants: {
    color: {
      blue:   { backgroundColor: '$primary100', color: '$primary600' },
      green:  { backgroundColor: '$success50',  color: '$success700' },
      orange: { backgroundColor: '$warning50',  color: '$warning700' },
      red:    { backgroundColor: '$danger50',   color: '$danger700'  },
    },
  },
})

const KpiValue = styled('div', { fontSize: '$3xl', fontWeight: '$bold', color: '$textPrimary', lineHeight: '$tight' })
const KpiLabel = styled('div', { fontSize: '$sm', color: '$textSecondary' })

const DashGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '$4',
  '@media (max-width: 1024px)': { gridTemplateColumns: '1fr' },
})

const AlertList = styled('ul', { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '$2' })

const AlertItem = styled('li', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: '$3',
  py: '$2',
  borderRadius: '$md',
  backgroundColor: '$danger50',
  border: '1px solid $danger500',
  fontSize: '$sm',
  '& .label': { color: '$danger700', fontWeight: '$medium' },
  '& .stock': { color: '$danger500', fontWeight: '$bold' },
})

const OrderTable = styled('table', {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '$sm',
  th: {
    textAlign: 'left', py: '$2', px: '$3', color: '$textSecondary', fontWeight: '$medium',
    borderBottom: '1px solid $border', fontSize: '$xs', textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  td: { py: '$3', px: '$3', borderBottom: '1px solid $border', color: '$textPrimary' },
  'tr:last-child td': { borderBottom: 'none' },
  'tr:hover td':      { backgroundColor: '$gray50' },
})

const EmptyState = styled('div', { textAlign: 'center', py: '$8', color: '$textSecondary', fontSize: '$sm' })

const PeriodSelect = styled('select', {
  px: '$3',
  py: '$2',
  fontSize: '$sm',
  border: '1px solid $border',
  borderRadius: '$md',
  backgroundColor: '$surface',
  color: '$textPrimary',
  cursor: 'pointer',
  outline: 'none',
  '&:focus': { borderColor: '$primary500' },
})

const RealtimeDot = styled('span', {
  display: 'inline-block',
  size: '8px',
  borderRadius: '$full',
  backgroundColor: '$success500',
  marginRight: '$2',
  variants: {
    pulse: { true: { animation: 'pulse 2s infinite' } },
  },
})

// ------- PERÍODOS -------
const PERIODS = [
  { value: '7',   label: 'Últimos 7 dias'   },
  { value: '14',  label: 'Últimos 14 dias'  },
  { value: '30',  label: 'Últimos 30 dias'  },
  { value: '90',  label: 'Últimos 3 meses'  },
]

function getPeriodStart(days) {
  return new Date(Date.now() - Number(days) * 86_400_000).toISOString()
}

function getMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

// ------- COMPONENTE -------
export default function Dashboard() {
  const { profile }  = useAuth()
  const toast        = useToast()
  const [period, setPeriod]     = useState('7')
  const [kpis,   setKpis]       = useState({ totalPiecesMonth: 0, openOrders: 0, openDispatches: 0, lowStockCount: 0 })
  const [lowStock,  setLowStock]  = useState([])
  const [orders,    setOrders]    = useState([])
  const [chartData,       setChartData]       = useState([])
  const [productionData,  setProductionData]  = useState([])
  const [orderStatusData, setOrderStatusData] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [realtime,  setRealtime]  = useState(false)
  const channelRef = useRef(null)

  const fetchData = useCallback(async (tenantId, chartDays) => {
    setLoading(true)
    try {
      const monthStart  = getMonthStart()
      const periodStart = getPeriodStart(chartDays)

      const [
        { data: piecesData },
        { count: openOrders },
        { count: openDispatches },
        { data: lowStockData },
        { data: ordersData },
        { data: chartRaw },
        { data: productionRaw },
        { data: allOrdersRaw },
      ] = await Promise.all([
        supabase.from('cutting_executions')
          .select('actual_total')
          .eq('tenant_id', tenantId)
          .eq('review_status', 'aprovado')
          .gte('created_at', monthStart),

        supabase.from('cutting_orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['pendente', 'em_corte', 'em_revisao']),

        supabase.from('faction_dispatches')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['enviado', 'em_producao']),

        supabase.from('vw_low_stock_alerts')
          .select('id, code, description, current_stock, minimum_stock, unit')
          .eq('tenant_id', tenantId)
          .limit(5),

        supabase.from('cutting_orders')
          .select('id, order_number, description, status, total_pieces, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(8),

        supabase.from('inventory_transactions')
          .select('type, quantity, created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', periodStart),

        supabase.from('cutting_executions')
          .select('actual_total, created_at')
          .eq('tenant_id', tenantId)
          .eq('review_status', 'aprovado')
          .gte('created_at', periodStart),

        supabase.from('cutting_orders')
          .select('status')
          .eq('tenant_id', tenantId),
      ])

      setKpis({
        totalPiecesMonth: piecesData?.reduce((a, r) => a + (r.actual_total || 0), 0) ?? 0,
        openOrders:       openOrders ?? 0,
        openDispatches:   openDispatches ?? 0,
        lowStockCount:    lowStockData?.length ?? 0,
      })
      setLowStock(lowStockData ?? [])
      setOrders(ordersData ?? [])

      const grouped = {}
      chartRaw?.forEach(tx => {
        const day = tx.created_at.slice(0, 10)
        if (!grouped[day]) grouped[day] = { dia: day, entradas: 0, saidas: 0 }
        if (tx.type === 'entrada') grouped[day].entradas += tx.quantity
        else                       grouped[day].saidas   += tx.quantity
      })
      setChartData(Object.values(grouped).sort((a, b) => a.dia.localeCompare(b.dia)))

      // Produção por dia
      const prodGrouped = {}
      productionRaw?.forEach(ex => {
        const day = ex.created_at.slice(0, 10)
        prodGrouped[day] = (prodGrouped[day] ?? 0) + (ex.actual_total ?? 0)
      })
      setProductionData(
        Object.entries(prodGrouped)
          .map(([dia, pecas]) => ({ dia, pecas }))
          .sort((a, b) => a.dia.localeCompare(b.dia))
      )

      // Status das ordens
      const STATUS_PT = {
        pendente:    'Pendente',
        em_corte:    'Em Corte',
        em_revisao:  'Em Revisão',
        concluido:   'Concluído',
        cancelado:   'Cancelado',
      }
      const statusCount = {}
      allOrdersRaw?.forEach(o => {
        const key = STATUS_PT[o.status] ?? o.status
        statusCount[key] = (statusCount[key] ?? 0) + 1
      })
      setOrderStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })))
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      toast?.error('Erro ao carregar dados do painel.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Subscrição realtime para inventory_transactions
  const startRealtime = useCallback((tenantId, chartDays) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_transactions',
        filter: `tenant_id=eq.${tenantId}`,
      }, () => fetchData(tenantId, chartDays))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cutting_orders',
        filter: `tenant_id=eq.${tenantId}`,
      }, () => fetchData(tenantId, chartDays))
      .subscribe((status) => {
        setRealtime(status === 'SUBSCRIBED')
      })
    channelRef.current = channel
  }, [fetchData])

  useEffect(() => {
    if (!profile?.tenant_id) return
    fetchData(profile.tenant_id, period)
    startRealtime(profile.tenant_id, period)
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [profile, period, fetchData, startRealtime])

  const formatDate = iso => new Date(iso).toLocaleDateString('pt-BR')

  return (
    <div>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PageTitle>Dashboard</PageTitle>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
            <RealtimeDot pulse={realtime} />
            {realtime ? 'Tempo real ativo' : 'Conectando...'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PeriodSelect value={period} onChange={e => setPeriod(e.target.value)}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </PeriodSelect>
          <Button variant="secondary" size="sm" onClick={() => fetchData(profile?.tenant_id, period)} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </Button>
        </div>
      </PageHeader>

      {/* KPIs */}
      {loading ? (
        <div style={{ marginBottom: 24 }}><SkeletonKpi count={4} /></div>
      ) : (
        <KpiGrid>
          <KpiCard hoverable>
            <KpiIcon color="blue"><Scissors size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.totalPiecesMonth.toLocaleString('pt-BR')}</KpiValue>
              <KpiLabel>Peças produzidas no mês</KpiLabel>
            </div>
          </KpiCard>
          <KpiCard hoverable>
            <KpiIcon color="orange"><Package size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.openOrders}</KpiValue>
              <KpiLabel>Ordens de corte abertas</KpiLabel>
            </div>
          </KpiCard>
          <KpiCard hoverable>
            <KpiIcon color="green"><Shirt size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.openDispatches}</KpiValue>
              <KpiLabel>Remessas em produção</KpiLabel>
            </div>
          </KpiCard>
          <KpiCard hoverable>
            <KpiIcon color="red"><AlertTriangle size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.lowStockCount}</KpiValue>
              <KpiLabel>Tecidos com estoque baixo</KpiLabel>
            </div>
          </KpiCard>
        </KpiGrid>
      )}

      <DashGrid>
        {/* Gráfico */}
        <Card>
          <CardHeader>
            <CardTitle>
              Movimentações — {PERIODS.find(p => p.value === period)?.label}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Carregando gráfico...
              </div>
            ) : chartData.length === 0 ? (
              <EmptyState>Sem movimentações no período.</EmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [v.toFixed(2) + 'm', n]} />
                  <Bar dataKey="entradas" name="Entradas" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="saidas"   name="Saídas"   fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Alertas de estoque */}
        <Card>
          <CardHeader>
            <CardTitle>
              <AlertTriangle size={16} style={{ color: '#ef4444', marginRight: 6 }} />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <EmptyState>Carregando alertas...</EmptyState>
            ) : lowStock.length === 0 ? (
              <EmptyState>Nenhum alerta de estoque.</EmptyState>
            ) : (
              <AlertList>
                {lowStock.map(f => (
                  <AlertItem key={f.id}>
                    <span className="label">[{f.code}] {f.description}</span>
                    <span className="stock">
                      {Number(f.current_stock).toFixed(1)} / {Number(f.minimum_stock).toFixed(1)} {f.unit}
                    </span>
                  </AlertItem>
                ))}
              </AlertList>
            )}
          </CardBody>
        </Card>
      </DashGrid>

      {/* Gráficos de Produção e Status */}
      <DashGrid css={{ mt: '$4' }}>
        {/* Produção por dia */}
        <Card>
          <CardHeader>
            <CardTitle>
              Peças Produzidas — {PERIODS.find(p => p.value === period)?.label}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Carregando...
              </div>
            ) : productionData.length === 0 ? (
              <EmptyState>Sem execuções aprovadas no período.</EmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={productionData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v.toLocaleString('pt-BR') + ' pç', 'Peças']} />
                  <Line type="monotone" dataKey="pecas" name="Peças" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Status das ordens */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Ordens por Status</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Carregando...
              </div>
            ) : orderStatusData.length === 0 ? (
              <EmptyState>Nenhuma ordem cadastrada.</EmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {orderStatusData.map((_, i) => (
                      <Cell key={i} fill={['#3b82f6','#f59e0b','#8b5cf6','#10b981','#ef4444'][i % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </DashGrid>

      {/* Últimas ordens */}
      <Card css={{ mt: '$4' }}>
        <CardHeader>
          <CardTitle>Últimas Ordens de Corte</CardTitle>
        </CardHeader>
        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : orders.length === 0 ? (
            <EmptyState>Nenhuma ordem cadastrada.</EmptyState>
          ) : (
            <OrderTable>
              <thead>
                <tr>
                  <th>Nº Ordem</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Total Peças</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.order_number}</strong></td>
                    <td>{o.description ?? '—'}</td>
                    <td>
                      <Badge color={STATUS_COLOR_MAP[o.status] ?? 'default'}>
                        {STATUS_LABEL_MAP[o.status] ?? o.status}
                      </Badge>
                    </td>
                    <td>{(o.total_pieces ?? 0).toLocaleString('pt-BR')}</td>
                    <td>{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </OrderTable>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
