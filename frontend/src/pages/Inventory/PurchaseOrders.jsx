/**
 * PurchaseOrders — Ordens de Reposição de Estoque
 *
 * Permite criar, acompanhar e marcar como recebidas as ordens de
 * compra de tecidos. Fecha o ciclo: alerta de estoque → pedido → recebimento.
 *
 * Requer migração: database/purchase_orders_migration.sql
 */
import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, Search, CheckCircle, XCircle, ShoppingCart, CalendarClock } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { translateError } from '@/lib/errorMessages'
import { useInventory } from '@/hooks/useInventory'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SkeletonTable } from '@/components/common/Skeleton'
import { Pagination, usePagination } from '@/components/common/Pagination'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$6',
})
const PageTitle = styled('h2', { fontSize: '$2xl', fontWeight: '$bold', color: '$textPrimary' })

const Toolbar = styled('div', {
  display: 'flex', gap: '$3', alignItems: 'center', marginBottom: '$4', flexWrap: 'wrap',
})

const SearchWrapper = styled('div', {
  position: 'relative', width: '240px',
  '& svg': { position: 'absolute', left: '$3', top: '50%', transform: 'translateY(-50%)', color: '$textDisabled', width: '16px', height: '16px', pointerEvents: 'none' },
})
const SearchInput = styled('input', {
  width: '100%', paddingLeft: '$8', paddingRight: '$3', py: '$2', fontSize: '$sm',
  border: '1px solid $border', borderRadius: '$md', outline: 'none',
  backgroundColor: '$surface', color: '$textPrimary',
  '&:focus': { borderColor: '$primary500', boxShadow: '0 0 0 3px $colors$primary100' },
  '&::placeholder': { color: '$textDisabled' },
})

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

const EmptyState = styled('div', {
  textAlign: 'center', py: '$12', color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const ErrorBanner = styled('div', {
  padding: '$3', borderRadius: '$md', backgroundColor: '$danger50',
  color: '$danger700', fontSize: '$sm', marginBottom: '$4',
})

const FormGrid = styled('div', {
  display: 'grid', gap: '$4',
  variants: { cols: { 2: { gridTemplateColumns: '1fr 1fr' }, 1: { gridTemplateColumns: '1fr' } } },
  defaultVariants: { cols: 1 },
})

// ------- CONSTANTES -------
const STATUS_CONFIG = {
  pendente:  { label: 'Pendente',   color: 'warning' },
  aprovado:  { label: 'Aprovado',   color: 'info'    },
  enviado:   { label: 'Enviado',    color: 'info'    },
  recebido:  { label: 'Recebido',   color: 'success' },
  cancelado: { label: 'Cancelado',  color: 'default' },
}

const STATUS_OPTIONS = [
  { value: '',          label: 'Todos os status' },
  { value: 'pendente',  label: 'Pendente'        },
  { value: 'aprovado',  label: 'Aprovado'        },
  { value: 'enviado',   label: 'Enviado'         },
  { value: 'recebido',  label: 'Recebido'        },
  { value: 'cancelado', label: 'Cancelado'       },
]

const EMPTY_FORM = {
  order_number:  '',
  supplier:      '',
  fabric_id:     '',
  quantity:      '',
  unit_cost:     '',
  expected_date: '',
}

const PAGE_SIZE = 25

// ------- COMPONENTE -------
export default function PurchaseOrders() {
  const { profile } = useAuth()
  const tenantId    = profile?.tenant_id
  const toast       = useToast()
  const { fetchFabrics } = useInventory()

  const [orders,   setOrders]   = useState([])
  const [fabrics,  setFabrics]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formError, setFormError] = useState('')

  const [modalNew,      setModalNew]      = useState(false)
  const [modalPostpone, setModalPostpone] = useState(null)   // order being postponed
  const [postponeDate,  setPostponeDate]  = useState('')
  const [confirmReceive, setConfirmReceive] = useState(null)
  const [confirmCancel,  setConfirmCancel]  = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)

  const filtered = orders.filter(o => {
    const term = search.toLowerCase()
    const matchSearch  = !search || o.order_number?.toLowerCase().includes(term) || o.supplier?.toLowerCase().includes(term)
    const matchStatus  = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const pagination = usePagination(filtered, PAGE_SIZE)

  const loadOrders = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          items:purchase_order_items(id, quantity_ordered, unit_cost, fabric:fabrics(code, description, unit))
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setOrders(data ?? [])
    } catch (err) {
      // Tabela pode não existir ainda — orientar o usuário
      if (err.code === '42P01') {
        toast?.warning('A tabela de reposição ainda não foi criada. Execute database/purchase_orders_migration.sql no Supabase.')
      } else {
        toast?.error('Erro ao carregar ordens: ' + translateError(err))
      }
    } finally {
      setLoading(false)
    }
  }, [tenantId, toast])

  useEffect(() => {
    if (!tenantId) return
    fetchFabrics().then(setFabrics)
    loadOrders()
  }, [tenantId, loadOrders])

  async function handleCreate() {
    if (!form.order_number.trim() || !form.supplier.trim() || !form.fabric_id || !form.quantity) {
      setFormError('Número, fornecedor, tecido e quantidade são obrigatórios.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const { data: order, error: oErr } = await supabase
        .from('purchase_orders')
        .insert({
          tenant_id:     tenantId,
          order_number:  form.order_number,
          supplier:      form.supplier,
          expected_date: form.expected_date || null,
          created_by:    profile?.id,
        })
        .select()
        .single()
      if (oErr) throw oErr

      const { error: iErr } = await supabase
        .from('purchase_order_items')
        .insert({
          tenant_id:        tenantId,
          purchase_order_id: order.id,
          fabric_id:        form.fabric_id,
          quantity_ordered: Number(form.quantity),
          unit_cost:        form.unit_cost ? Number(form.unit_cost) : null,
        })
      if (iErr) throw iErr

      toast?.success(`Ordem ${form.order_number} criada com sucesso.`)
      setModalNew(false)
      setForm(EMPTY_FORM)
      await loadOrders()
    } catch (err) {
      if (err.code === '23505') {
        setFormError('Já existe uma ordem com esse número.')
      } else {
        setFormError(err.message || 'Erro ao criar ordem.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleReceive(order) {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'recebido', received_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('tenant_id', tenantId)
      if (error) throw error
      toast?.success(`Ordem ${order.order_number} marcada como recebida.`)
      await loadOrders()
    } catch (err) {
      toast?.error(translateError(err))
    }
  }

  async function handleCancel(order) {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'cancelado' })
        .eq('id', order.id)
        .eq('tenant_id', tenantId)
      if (error) throw error
      toast?.success(`Ordem ${order.order_number} cancelada.`)
      await loadOrders()
    } catch (err) {
      toast?.error(translateError(err))
    }
  }

  async function handlePostpone() {
    if (!postponeDate) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ expected_date: postponeDate })
        .eq('id', modalPostpone.id)
        .eq('tenant_id', tenantId)
      if (error) throw error
      toast?.success(`Prazo da ordem ${modalPostpone.order_number} prorrogado.`)
      setModalPostpone(null)
      setPostponeDate('')
      await loadOrders()
    } catch (err) {
      toast?.error(translateError(err))
    } finally {
      setSaving(false)
    }
  }

  const fabricOptions = fabrics.map(f => ({
    value: f.id,
    label: `${f.code} — ${f.description}${f.color ? ` (${f.color})` : ''}`,
  }))

  return (
    <div>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCart size={22} style={{ color: '#2563eb' }} />
          <PageTitle>Ordens de Reposição</PageTitle>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={loadOrders} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setFormError(''); setModalNew(true) }}>
            <Plus size={14} /> Nova Ordem
          </Button>
        </div>
      </PageHeader>

      <Card padding="none">
        <CardHeader css={{ px: '$4', pt: '$4', pb: '0', borderBottom: 'none' }}>
          <Toolbar>
            <SearchWrapper>
              <Search />
              <SearchInput
                placeholder="Busca"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </SearchWrapper>
            <div style={{ minWidth: 180 }}>
              <Select
                id="status_filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                options={STATUS_OPTIONS}
              />
            </div>
          </Toolbar>
        </CardHeader>

        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : pagination.total === 0 ? (
            <EmptyState>
              <ShoppingCart size={36} style={{ opacity: 0.2 }} />
              <p>{search || statusFilter ? 'Nenhuma ordem encontrada.' : 'Nenhuma ordem cadastrada. Clique em "Nova Ordem" para começar.'}</p>
            </EmptyState>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <th>Nº Ordem</th>
                    <th>Fornecedor</th>
                    <th>Tecido</th>
                    <th>Quantidade</th>
                    <th>Custo Unitário</th>
                    <th>Custo Total</th>
                    <th>Previsão</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginated.map(o => {
                    const item      = o.items?.[0]
                    const fabric    = item?.fabric
                    const cfg       = STATUS_CONFIG[o.status] ?? { label: o.status, color: 'default' }
                    const canReceive = ['pendente', 'aprovado', 'enviado'].includes(o.status)
                    const canCancel  = ['pendente', 'aprovado'].includes(o.status)
                    const canPostpone = !['recebido', 'cancelado'].includes(o.status)
                    const qty        = item ? Number(item.quantity_ordered) : 0
                    const unitCost   = item?.unit_cost ? Number(item.unit_cost) : null
                    const totalCost  = unitCost != null ? qty * unitCost : null
                    return (
                      <tr key={o.id}>
                        <td><strong>{o.order_number}</strong></td>
                        <td>{o.supplier}</td>
                        <td>
                          {fabric
                            ? `${fabric.code} — ${fabric.description}`
                            : '—'}
                        </td>
                        <td>
                          {item
                            ? `${qty.toFixed(2)} ${fabric?.unit ?? ''}`
                            : '—'}
                        </td>
                        <td>
                          {unitCost != null
                            ? unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : '—'}
                        </td>
                        <td>
                          {totalCost != null
                            ? totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : '—'}
                        </td>
                        <td>
                          {o.expected_date ? new Date(o.expected_date).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td><Badge color={cfg.color}>{cfg.label}</Badge></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {canPostpone && (
                              <Button variant="secondary" size="xs" onClick={() => {
                                setModalPostpone(o)
                                setPostponeDate(o.expected_date?.slice(0, 10) ?? '')
                              }}>
                                <CalendarClock size={12} /> Prorrogar
                              </Button>
                            )}
                            {canReceive && (
                              <Button variant="success" size="xs" onClick={() => setConfirmReceive(o)}>
                                <CheckCircle size={12} /> Recebido
                              </Button>
                            )}
                            {canCancel && (
                              <Button variant="ghost" size="xs" onClick={() => setConfirmCancel(o)}>
                                <XCircle size={12} /> Cancelar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      {/* Modal Nova Ordem */}
      <Modal open={modalNew} onClose={() => setModalNew(false)} title="Nova Ordem de Reposição" size="md">
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormGrid cols="2">
            <Input id="po_num"    label="Nº da Ordem *" placeholder="Ex: REP-2025-001"
              value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} />
            <Input id="po_sup"    label="Fornecedor *" placeholder="Ex: Textil SA"
              value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
          </FormGrid>
          <Select id="po_fabric" label="Tecido *" value={form.fabric_id}
            onChange={e => setForm(f => ({ ...f, fabric_id: e.target.value }))}
            options={fabricOptions} placeholder="Selecione um tecido..." />
          <FormGrid cols="2">
            <Input id="po_qty"   label="Quantidade *" type="number" min="0.01" step="0.01" placeholder="0,00"
              value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input id="po_cost"  label="Custo do Insumo (R$/un.)" type="number" min="0" step="0.0001" placeholder="0,0000"
              value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
          </FormGrid>
          {form.quantity && form.unit_cost && (
            <div style={{
              padding: '8px 12px', borderRadius: 6, backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe', fontSize: '0.875rem', color: '#1e40af',
            }}>
              <strong>Custo Total dos Insumos:</strong>{' '}
              {(Number(form.quantity) * Number(form.unit_cost)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          )}
          <Input id="po_date"  label="Data prevista de chegada" type="date"
            value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalNew(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Criando...' : 'Criar Ordem'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Prorrogar Data */}
      <Modal
        open={!!modalPostpone}
        onClose={() => { setModalPostpone(null); setPostponeDate('') }}
        title={`Prorrogar Prazo — ${modalPostpone?.order_number ?? ''}`}
        size="sm"
      >
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Prazo atual:{' '}
            <strong>
              {modalPostpone?.expected_date
                ? new Date(modalPostpone.expected_date).toLocaleDateString('pt-BR')
                : 'Não definido'}
            </strong>
          </p>
          <Input
            id="postpone_date"
            label="Nova data de entrega *"
            type="date"
            value={postponeDate}
            onChange={e => setPostponeDate(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setModalPostpone(null); setPostponeDate('') }} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handlePostpone} disabled={saving || !postponeDate}>
            {saving ? 'Salvando...' : 'Prorrogar'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirmação recebimento */}
      <ConfirmDialog
        open={!!confirmReceive}
        onClose={() => setConfirmReceive(null)}
        onConfirm={() => handleReceive(confirmReceive)}
        title="Confirmar recebimento"
        message={`Marcar a ordem ${confirmReceive?.order_number} como recebida? Esta ação não pode ser desfeita.`}
        confirmLabel="Marcar como Recebido"
        danger={false}
      />

      {/* Confirmação cancelamento */}
      <ConfirmDialog
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => handleCancel(confirmCancel)}
        title="Cancelar ordem"
        message={`Cancelar a ordem ${confirmCancel?.order_number}? Esta ação não pode ser desfeita.`}
        confirmLabel="Cancelar Ordem"
        danger
      />
    </div>
  )
}
