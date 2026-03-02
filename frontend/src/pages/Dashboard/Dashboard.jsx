/**
 * Dashboard — Painel em tempo real
 *
 * Exibe KPIs principais do mês, alertas de estoque mínimo,
 * gráfico de movimentações e remessas abertas.
 */
import { useEffect, useState } from 'react'
import { Package, Scissors, Shirt, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Badge, STATUS_COLOR_MAP, STATUS_LABEL_MAP } from '@/components/common/Badge'

// ------- ESTILOS -------
const PageTitle = styled('h2', {
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: '$textPrimary',
  mb: '$6',
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

const KpiValue = styled('div', {
  fontSize: '$3xl',
  fontWeight: '$bold',
  color: '$textPrimary',
  lineHeight: '$tight',
})

const KpiLabel = styled('div', {
  fontSize: '$sm',
  color: '$textSecondary',
})

const DashGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '$4',

  '@media (max-width: 1024px)': {
    gridTemplateColumns: '1fr',
  },
})

const AlertList = styled('ul', {
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
})

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

  'th': {
    textAlign: 'left',
    py: '$2',
    px: '$3',
    color: '$textSecondary',
    fontWeight: '$medium',
    borderBottom: '1px solid $border',
    fontSize: '$xs',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },

  'td': {
    py: '$3',
    px: '$3',
    borderBottom: '1px solid $border',
    color: '$textPrimary',
  },

  'tr:last-child td': { borderBottom: 'none' },
  'tr:hover td':      { backgroundColor: '$gray50' },
})

const EmptyState = styled('div', {
  textAlign: 'center',
  py: '$8',
  color: '$textSecondary',
  fontSize: '$sm',
})

// ------- COMPONENTE -------
export default function Dashboard() {
  const { profile } = useAuth()
  const [kpis,       setKpis]       = useState({ totalPiecesMonth: 0, openOrders: 0, openDispatches: 0, lowStockCount: 0 })
  const [lowStock,   setLowStock]   = useState([])
  const [orders,     setOrders]     = useState([])
  const [chartData,  setChartData]  = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!profile?.tenant_id) return
    fetchDashboardData(profile.tenant_id)
  }, [profile])

  async function fetchDashboardData(tenantId) {
    setLoading(true)
    try {
      const now   = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // KPIs em paralelo
      const [
        { data: piecesData },
        { count: openOrders },
        { count: openDispatches },
        { data: lowStockData },
        { data: ordersData },
        { data: chartRaw },
      ] = await Promise.all([
        // Total de peças do mês (execuções de corte aprovadas)
        supabase
          .from('cutting_executions')
          .select('actual_total')
          .eq('tenant_id', tenantId)
          .eq('review_status', 'aprovado')
          .gte('created_at', start),

        // Ordens abertas
        supabase
          .from('cutting_orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['pendente', 'em_corte', 'em_revisao']),

        // Remessas em aberto
        supabase
          .from('faction_dispatches')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['enviado', 'em_producao']),

        // Alertas de estoque mínimo
        supabase
          .from('vw_low_stock_alerts')
          .select('id, code, description, current_stock, minimum_stock, unit')
          .eq('tenant_id', tenantId)
          .limit(5),

        // Últimas ordens de corte
        supabase
          .from('cutting_orders')
          .select('id, order_number, description, status, total_pieces, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(8),

        // Movimentações dos últimos 7 dias para o gráfico
        supabase
          .from('inventory_transactions')
          .select('type, quantity, created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])

      // Processa KPIs
      const totalPiecesMonth = piecesData?.reduce((acc, r) => acc + (r.actual_total || 0), 0) ?? 0

      setKpis({
        totalPiecesMonth,
        openOrders:    openOrders ?? 0,
        openDispatches: openDispatches ?? 0,
        lowStockCount: lowStockData?.length ?? 0,
      })

      setLowStock(lowStockData ?? [])
      setOrders(ordersData ?? [])

      // Processa dados do gráfico (agrupa por dia)
      const grouped = {}
      chartRaw?.forEach(tx => {
        const day = tx.created_at.slice(0, 10)
        if (!grouped[day]) grouped[day] = { dia: day, entradas: 0, saidas: 0 }
        if (tx.type === 'entrada') grouped[day].entradas += tx.quantity
        else                       grouped[day].saidas   += tx.quantity
      })
      setChartData(Object.values(grouped).sort((a, b) => a.dia.localeCompare(b.dia)))

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = iso => new Date(iso).toLocaleDateString('pt-BR')

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>

      {/* KPIs */}
      <KpiGrid>
        <KpiCard hoverable>
          <KpiIcon color="blue"><Scissors size={22} /></KpiIcon>
          <div>
            <KpiValue>{loading ? '—' : kpis.totalPiecesMonth.toLocaleString('pt-BR')}</KpiValue>
            <KpiLabel>Peças produzidas no mês</KpiLabel>
          </div>
        </KpiCard>

        <KpiCard hoverable>
          <KpiIcon color="orange"><Package size={22} /></KpiIcon>
          <div>
            <KpiValue>{loading ? '—' : kpis.openOrders}</KpiValue>
            <KpiLabel>Ordens de corte abertas</KpiLabel>
          </div>
        </KpiCard>

        <KpiCard hoverable>
          <KpiIcon color="green"><Shirt size={22} /></KpiIcon>
          <div>
            <KpiValue>{loading ? '—' : kpis.openDispatches}</KpiValue>
            <KpiLabel>Remessas em produção</KpiLabel>
          </div>
        </KpiCard>

        <KpiCard hoverable>
          <KpiIcon color="red"><AlertTriangle size={22} /></KpiIcon>
          <div>
            <KpiValue>{loading ? '—' : kpis.lowStockCount}</KpiValue>
            <KpiLabel>Tecidos com estoque baixo</KpiLabel>
          </div>
        </KpiCard>
      </KpiGrid>

      <DashGrid>
        {/* Gráfico de movimentações */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentações — últimos 7 dias</CardTitle>
          </CardHeader>
          <CardBody>
            {chartData.length === 0 ? (
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

        {/* Alertas de estoque mínimo */}
        <Card>
          <CardHeader>
            <CardTitle>
              <AlertTriangle size={16} style={{ color: '#ef4444', marginRight: 6 }} />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardBody>
            {lowStock.length === 0 ? (
              <EmptyState>Nenhum alerta de estoque.</EmptyState>
            ) : (
              <AlertList>
                {lowStock.map(f => (
                  <AlertItem key={f.id}>
                    <div>
                      <span className="label">[{f.code}] {f.description}</span>
                    </div>
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

      {/* Últimas ordens de corte */}
      <Card css={{ mt: '$4' }}>
        <CardHeader>
          <CardTitle>Últimas Ordens de Corte</CardTitle>
        </CardHeader>
        <CardBody>
          {orders.length === 0 ? (
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
