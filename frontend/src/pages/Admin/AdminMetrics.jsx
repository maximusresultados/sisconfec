/**
 * AdminMetrics — Painel de métricas e log de acesso (somente admin)
 *
 * Item 12: KPIs do tenant + gráficos de atividade por módulo e por dia
 * Item 13: Tabela de último acesso por usuário
 */
import { useEffect, useState, useCallback } from 'react'
import { BarChart2, RefreshCw, Users, Activity, TrendingUp, Clock } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { translateError } from '@/lib/errorMessages'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { SkeletonKpi, SkeletonTable } from '@/components/common/Skeleton'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '$6',
})
const PageTitle = styled('h2', { fontSize: '$2xl', fontWeight: '$bold', color: '$textPrimary' })

const KpiGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '$4',
  mb: '$6',
})

const KpiCard = styled(Card, {
  display: 'flex', alignItems: 'center', gap: '$4', padding: '$5',
})

const KpiIcon = styled('div', {
  size: '48px', borderRadius: '$lg', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  variants: {
    color: {
      blue:   { backgroundColor: '$primary100', color: '$primary600' },
      green:  { backgroundColor: '$success50',  color: '$success700' },
      orange: { backgroundColor: '$warning50',  color: '$warning700' },
      purple: { backgroundColor: '#f3e8ff',     color: '#7c3aed'     },
    },
  },
})

const KpiValue = styled('div', { fontSize: '$3xl', fontWeight: '$bold', color: '$textPrimary', lineHeight: '$tight' })
const KpiLabel = styled('div', { fontSize: '$sm', color: '$textSecondary' })

const ChartsGrid = styled('div', {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '$4', mb: '$6',
  '@media (max-width: 1024px)': { gridTemplateColumns: '1fr' },
})

const Table = styled('table', {
  width: '100%', borderCollapse: 'collapse', fontSize: '$sm',
  th: {
    textAlign: 'left', py: '$3', px: '$4', color: '$textSecondary',
    fontWeight: '$medium', borderBottom: '1px solid $border', fontSize: '$xs',
    textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '$gray50',
  },
  td: { py: '$3', px: '$4', borderBottom: '1px solid $border', color: '$textPrimary', verticalAlign: 'middle' },
  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})

const EmptyState = styled('div', {
  textAlign: 'center', py: '$8', color: '$textSecondary', fontSize: '$sm',
})

// ------- MAPEAMENTOS -------
const TABLE_LABEL = {
  cutting_orders:         'Ordens de Corte',
  cutting_executions:     'Execuções',
  faction_dispatches:     'Remessas',
  inventory_transactions: 'Movim. Estoque',
  technical_sheets:       'Fichas Técnicas',
}

const ROLE_COLOR = {
  admin:             'danger',
  estoquista:        'info',
  encarregado_corte: 'warning',
  gestor_faccao:     'success',
}

const ROLE_LABEL = {
  admin:             'Administrador',
  estoquista:        'Estoquista',
  encarregado_corte: 'Enc. de Corte',
  gestor_faccao:     'Gestor Facção',
}

const MODULE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function daysAgo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  return `há ${days} dias`
}

// ------- COMPONENTE -------
export default function AdminMetrics() {
  const { profile } = useAuth()
  const toast = useToast()
  const tenantId = profile?.tenant_id

  const [loading,      setLoading]      = useState(true)
  const [kpis,         setKpis]         = useState({ totalUsers: 0, activeUsers: 0, activityMonth: 0, openOrders: 0 })
  const [moduleData,   setModuleData]   = useState([])  // atividade por módulo
  const [dailyData,    setDailyData]    = useState([])  // atividade por dia
  const [users,        setUsers]        = useState([])  // último acesso

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const period30   = new Date(Date.now() - 30 * 86_400_000).toISOString()

    try {
      const [
        { data: usersData },
        { data: activityData },
        { count: openOrdersCount },
      ] = await Promise.all([
        supabase.from('profiles')
          .select('id, full_name, email, role, is_active, last_seen_at')
          .eq('tenant_id', tenantId)
          .order('last_seen_at', { ascending: false, nullsLast: true }),

        supabase.from('activity_log')
          .select('table_name, created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', period30),

        supabase.from('cutting_orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['pendente', 'em_corte', 'em_revisao']),
      ])

      // KPIs
      const active = (usersData ?? []).filter(u => u.is_active).length
      const actMonth = (activityData ?? []).filter(a => a.created_at >= monthStart).length
      setKpis({
        totalUsers:    usersData?.length ?? 0,
        activeUsers:   active,
        activityMonth: actMonth,
        openOrders:    openOrdersCount ?? 0,
      })

      // Atividade por módulo
      const byModule = {}
      activityData?.forEach(a => {
        const label = TABLE_LABEL[a.table_name] ?? a.table_name
        byModule[label] = (byModule[label] ?? 0) + 1
      })
      setModuleData(
        Object.entries(byModule)
          .map(([modulo, total]) => ({ modulo, total }))
          .sort((a, b) => b.total - a.total)
      )

      // Atividade por dia (últimos 30 dias)
      const byDay = {}
      activityData?.forEach(a => {
        const day = a.created_at.slice(0, 10)
        byDay[day] = (byDay[day] ?? 0) + 1
      })
      setDailyData(
        Object.entries(byDay)
          .map(([dia, ações]) => ({ dia, ações }))
          .sort((a, b) => a.dia.localeCompare(b.dia))
      )

      setUsers(usersData ?? [])
    } catch (err) {
      toast?.error('Erro ao carregar métricas: ' + translateError(err))
    } finally {
      setLoading(false)
    }
  }, [tenantId, toast])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={22} style={{ color: '#2563eb' }} />
          <PageTitle>Painel Administrativo</PageTitle>
        </div>
        <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Atualizar
        </Button>
      </PageHeader>

      {/* KPIs */}
      {loading ? (
        <div style={{ marginBottom: 24 }}><SkeletonKpi count={4} /></div>
      ) : (
        <KpiGrid>
          <KpiCard hoverable>
            <KpiIcon color="blue"><Users size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.totalUsers}</KpiValue>
              <KpiLabel>Total de usuários</KpiLabel>
            </div>
          </KpiCard>
          <KpiCard hoverable>
            <KpiIcon color="green"><Users size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.activeUsers}</KpiValue>
              <KpiLabel>Usuários ativos</KpiLabel>
            </div>
          </KpiCard>
          <KpiCard hoverable>
            <KpiIcon color="orange"><Activity size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.activityMonth.toLocaleString('pt-BR')}</KpiValue>
              <KpiLabel>Ações este mês</KpiLabel>
            </div>
          </KpiCard>
          <KpiCard hoverable>
            <KpiIcon color="purple"><TrendingUp size={22} /></KpiIcon>
            <div>
              <KpiValue>{kpis.openOrders}</KpiValue>
              <KpiLabel>Ordens de corte abertas</KpiLabel>
            </div>
          </KpiCard>
        </KpiGrid>
      )}

      {/* Gráficos */}
      <ChartsGrid>
        {/* Atividade por módulo */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade por Módulo — últimos 30 dias</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Carregando...
              </div>
            ) : moduleData.length === 0 ? (
              <EmptyState>Sem atividade registrada.</EmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={moduleData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="modulo" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="total" name="Ações" radius={[0,4,4,0]}>
                    {moduleData.map((_, i) => (
                      <rect key={i} fill={MODULE_COLORS[i % MODULE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Atividade diária */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Diária — últimos 30 dias</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Carregando...
              </div>
            ) : dailyData.length === 0 ? (
              <EmptyState>Sem atividade registrada.</EmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={v => new Date(v).toLocaleDateString('pt-BR')} />
                  <Line type="monotone" dataKey="ações" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </ChartsGrid>

      {/* Log de acesso por usuário */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>
            <Clock size={16} style={{ marginRight: 6 }} />
            Log de Acesso por Usuário
          </CardTitle>
        </CardHeader>
        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : users.length === 0 ? (
            <EmptyState>Nenhum usuário encontrado.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Último acesso</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td style={{ color: '#6b7280', fontSize: '0.8125rem' }}>{u.email}</td>
                    <td>
                      <Badge color={ROLE_COLOR[u.role] ?? 'default'}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={u.is_active ? 'success' : 'default'}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: u.last_seen_at ? '#374151' : '#9ca3af' }}>
                      {formatDate(u.last_seen_at) ?? 'Nunca acessou'}
                    </td>
                    <td>
                      {u.last_seen_at ? (
                        <span style={{
                          fontSize: '0.75rem',
                          color: daysAgo(u.last_seen_at) === 'hoje' ? '#16a34a'
                               : daysAgo(u.last_seen_at) === 'ontem' ? '#d97706'
                               : '#9ca3af',
                        }}>
                          {daysAgo(u.last_seen_at)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
