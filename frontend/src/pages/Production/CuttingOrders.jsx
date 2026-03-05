/**
 * CuttingOrders — Ordens de Corte com Execução e Revisão de Qualidade
 */
import { useEffect, useState } from 'react'
import { Plus, Search, RefreshCw, Scissors, CheckCircle, Printer, XCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { styled } from '@/styles/stitches.config'
import { useCuttingOrders } from '@/hooks/useCuttingOrders'
import { useInventory } from '@/hooks/useInventory'
import { useTechnicalSheets } from '@/hooks/useTechnicalSheets'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardBody } from '@/components/common/Card'
import { Badge, STATUS_COLOR_MAP, STATUS_LABEL_MAP } from '@/components/common/Badge'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { GradeGrid, formatGradeString, expandGrade } from '@/components/common/GradeGrid'

// ------- CONSTANTES -------
const STATUS_OPTIONS = [
  { value: '',           label: 'Todos os status' },
  { value: 'pendente',   label: 'Pendente' },
  { value: 'em_corte',   label: 'Em Corte' },
  { value: 'cortado',    label: 'Cortado' },
  { value: 'em_revisao', label: 'Em Revisão' },
  { value: 'aprovado',   label: 'Aprovado' },
  { value: 'cancelado',  label: 'Cancelado' },
]

const PRIORITY_OPTIONS = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta',    label: 'Alta' },
  { value: 'normal',  label: 'Normal' },
  { value: 'baixa',   label: 'Baixa' },
]

const PRIORITY_COLOR = {
  urgente: 'danger',
  alta:    'warning',
  normal:  'default',
  baixa:   'default',
}

const PRIORITY_LABELS = {
  urgente: 'Urgente',
  alta:    'Alta',
  normal:  'Normal',
  baixa:   'Baixa',
}

const EMPTY_GRADE = { pp: 0, p: 0, m: 0, g: 0, gg: 0, xgg: 0 }

const EMPTY_ORDER_FORM = {
  order_number: '',
  description: '',
  fabric_id: '',
  technical_sheet_id: '',
  quantity_meters: '',
  grade: { ...EMPTY_GRADE },
  priority: 'normal',
  due_date: '',
  notes: '',
}

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

const Toolbar = styled('div', {
  display: 'flex',
  gap: '$3',
  alignItems: 'center',
  marginBottom: '$4',
  flexWrap: 'wrap',
})

const SearchWrapper = styled('div', {
  position: 'relative',
  width: '240px',

  '& svg': {
    position: 'absolute',
    left: '$3',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '$textDisabled',
    width: '16px',
    height: '16px',
    pointerEvents: 'none',
  },
})

const SearchInput = styled('input', {
  width: '100%',
  paddingLeft: '$8',
  paddingRight: '$3',
  py: '$2',
  fontSize: '$sm',
  border: '1px solid $border',
  borderRadius: '$md',
  outline: 'none',
  backgroundColor: '$surface',
  color: '$textPrimary',

  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 3px $colors$primary100',
  },
})

const FilterSelect = styled('select', {
  px: '$3',
  py: '$2',
  fontSize: '$sm',
  border: '1px solid $border',
  borderRadius: '$md',
  outline: 'none',
  backgroundColor: '$surface',
  color: '$textPrimary',

  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 3px $colors$primary100',
  },
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

const EmptyState = styled('div', {
  textAlign: 'center',
  py: '$12',
  color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const FormGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '$4',
})

const FormRow = styled('div', {
  gridColumn: 'span 2',
})

const ErrorBanner = styled('div', {
  padding: '$3 $4',
  backgroundColor: '$danger50',
  borderRadius: '$md',
  color: '$danger700',
  fontSize: '$sm',
  marginBottom: '$4',
})

const ReviewRadioGroup = styled('div', {
  display: 'flex',
  gap: '$6',
  marginBottom: '$4',

  '& label': {
    display: 'flex',
    alignItems: 'center',
    gap: '$2',
    fontSize: '$sm',
    cursor: 'pointer',
    color: '$textPrimary',
  },
})

// ------- COMPONENTE -------
export default function CuttingOrders() {
  const { isCortador, isAdmin } = useAuth()
  const {
    loading, error,
    fetchOrders, createOrder, updateOrderStatus,
    fetchExecutions, createExecution, reviewExecution,
  } = useCuttingOrders()
  const { fetchFabrics, registerExit } = useInventory()
  const { fetchSheets, fetchSheetById } = useTechnicalSheets()

  const [orders,       setOrders]       = useState([])
  const [fabrics,      setFabrics]      = useState([])
  const [sheets,       setSheets]       = useState([])
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modais
  const [showNewOrder,    setShowNewOrder]    = useState(false)
  const [showRegisterCut, setShowRegisterCut] = useState(null) // order
  const [showReview,      setShowReview]      = useState(null) // { order, execution }

  // Formulário Nova Ordem
  const [orderForm,   setOrderForm]   = useState(EMPTY_ORDER_FORM)
  const [orderError,  setOrderError]  = useState('')
  const [savingOrder, setSavingOrder] = useState(false)

  // Formulário Registrar Corte
  const [cutGrade,   setCutGrade]   = useState({ ...EMPTY_GRADE })
  const [metersUsed, setMetersUsed] = useState('')
  const [cutError,   setCutError]   = useState('')
  const [savingCut,  setSavingCut]  = useState(false)

  // Formulário Revisão
  const [reviewStatus, setReviewStatus] = useState('')
  const [reviewNotes,  setReviewNotes]  = useState('')
  const [reviewError,  setReviewError]  = useState('')
  const [savingReview, setSavingReview] = useState(false)

  const canEdit = isCortador() || isAdmin()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [ords, fabs, shs] = await Promise.all([
      fetchOrders(),
      fetchFabrics(),
      fetchSheets(),
    ])
    setOrders(ords)
    setFabrics(fabs)
    setSheets(shs)
  }

  // Filtra localmente por busca e status
  const filtered = orders
    .filter(o => {
      const term = search.toLowerCase()
      return (
        o.order_number.toLowerCase().includes(term) ||
        (o.description ?? '').toLowerCase().includes(term) ||
        (o.fabric?.description ?? '').toLowerCase().includes(term)
      )
    })
    .filter(o => !statusFilter || o.status === statusFilter)

  const fabricOptions = fabrics.map(f => ({
    value: f.id,
    label: `${f.code} — ${f.description}${f.color ? ` (${f.color})` : ''}`,
  }))

  const sheetOptions = sheets.map(s => ({
    value: s.id,
    label: `${s.product_code} — ${s.product_name}`,
  }))

  function handleSheetChange(sheetId) {
    setOrderField('technical_sheet_id', sheetId)
    if (sheetId) {
      const sheet = sheets.find(s => s.id === sheetId)
      if (sheet && !orderForm.description) {
        setOrderField('description', sheet.product_name)
      }
    }
  }

  async function generatePDF(order) {
    const doc = new jsPDF()
    const margin = 14
    let y = 20

    // Cabeçalho
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ORDEM DE CORTE', margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nº: ${order.order_number}`, margin, y)
    doc.text(`Data: ${new Date(order.created_at).toLocaleDateString('pt-BR')}`, 100, y)
    y += 6
    doc.text(`Status: ${STATUS_LABEL_MAP[order.status] ?? order.status}`, margin, y)
    doc.text(`Prioridade: ${PRIORITY_LABELS[order.priority] ?? order.priority}`, 100, y)
    y += 6

    if (order.fabric) {
      doc.text(`Tecido: ${order.fabric.code} — ${order.fabric.description}${order.fabric.color ? ` (${order.fabric.color})` : ''}`, margin, y)
      y += 6
    }
    if (order.quantity_meters) {
      doc.text(`Metragem: ${Number(order.quantity_meters).toLocaleString('pt-BR')} metros`, margin, y)
      y += 6
    }
    if (order.due_date) {
      doc.text(`Prazo: ${new Date(order.due_date).toLocaleDateString('pt-BR')}`, margin, y)
      y += 6
    }
    if (order.description) {
      doc.text(`Descrição: ${order.description}`, margin, y)
      y += 6
    }

    // Grade
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.text('GRADE PLANEJADA', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const sizes = ['pp','p','m','g','gg','xgg']
    const labels = ['PP','P','M','G','GG','XGG']
    sizes.forEach((s, i) => {
      const qty = order[`qty_${s}`] ?? 0
      if (qty > 0) {
        doc.text(`${labels[i]}: ${qty}`, margin + (i * 28), y)
      }
    })
    y += 6
    doc.text(`Total: ${order.total_pieces ?? 0} peças`, margin, y)

    // Ficha Técnica
    if (order.technical_sheet_id) {
      try {
        const sheet = await fetchSheetById(order.technical_sheet_id)
        y += 10
        doc.setLineWidth(0.5)
        doc.line(margin, y, 196, y)
        y += 6

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text('FICHA TÉCNICA', margin, y)
        y += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Produto: ${sheet.product_name}  (${sheet.product_code})`, margin, y)
        y += 6
        if (sheet.description) {
          doc.text(`Descrição: ${sheet.description}`, margin, y)
          y += 6
        }

        if (sheet.items?.length > 0) {
          y += 2
          doc.setFont('helvetica', 'bold')
          doc.text('Insumos:', margin, y)
          y += 6
          doc.setFont('helvetica', 'normal')

          sheet.items.forEach((item, idx) => {
            if (y > 270) { doc.addPage(); y = 20 }
            const tipo = item.item_type ? `[${item.item_type}] ` : ''
            const qty  = item.quantity_per_piece != null ? ` — ${item.quantity_per_piece} ${item.unit ?? ''}` : ''
            const cor  = item.color ? ` (${item.color})` : ''
            doc.text(`${idx + 1}. ${tipo}${item.description}${cor}${qty}`, margin + 4, y)
            y += 5
          })
        }
      } catch {
        // se falhar ao buscar a ficha, ignora
      }
    }

    if (order.notes) {
      y += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Observações:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.text(order.notes, margin, y, { maxWidth: 182 })
    }

    doc.save(`ordem-corte-${order.order_number}.pdf`)
  }

  // ------- NOVA ORDEM -------
  function openNewOrder() {
    setOrderForm(EMPTY_ORDER_FORM)
    setOrderError('')
    setShowNewOrder(true)
  }

  function setOrderField(key, value) {
    setOrderForm(f => ({ ...f, [key]: value }))
  }

  async function handleSaveOrder() {
    if (!orderForm.order_number.trim()) {
      setOrderError('O número da ordem é obrigatório.')
      return
    }
    const totalPieces = Object.values(orderForm.grade).reduce((a, v) => a + (Number(v) || 0), 0)
    if (totalPieces === 0) {
      setOrderError('Informe pelo menos 1 peça na grade.')
      return
    }

    setSavingOrder(true)
    setOrderError('')
    try {
      await createOrder({
        order_number:       orderForm.order_number.trim(),
        description:        orderForm.description || null,
        fabric_id:          orderForm.fabric_id || null,
        technical_sheet_id: orderForm.technical_sheet_id || null,
        quantity_meters:    orderForm.quantity_meters !== '' ? Number(orderForm.quantity_meters) : null,
        priority:           orderForm.priority,
        due_date:           orderForm.due_date || null,
        notes:              orderForm.notes || null,
        ...expandGrade(orderForm.grade, 'qty_'),
      })
      setShowNewOrder(false)
      loadAll()
    } catch (err) {
      setOrderError(err.message)
    } finally {
      setSavingOrder(false)
    }
  }

  // ------- REGISTRAR CORTE -------
  function openRegisterCut(order) {
    setCutGrade({ ...EMPTY_GRADE })
    setMetersUsed('')
    setCutError('')
    setShowRegisterCut(order)
  }

  async function handleSaveCut() {
    const total = Object.values(cutGrade).reduce((a, v) => a + (Number(v) || 0), 0)
    if (total === 0) {
      setCutError('Informe pelo menos 1 peça na grade efetiva.')
      return
    }

    setSavingCut(true)
    setCutError('')
    try {
      await createExecution({
        cutting_order_id: showRegisterCut.id,
        meters_used:      metersUsed !== '' ? Number(metersUsed) : null,
        ...expandGrade(cutGrade, 'actual_qty_'),
      })
      await updateOrderStatus(showRegisterCut.id, 'cortado')
      setShowRegisterCut(null)
      loadAll()
    } catch (err) {
      setCutError(err.message)
    } finally {
      setSavingCut(false)
    }
  }

  // ------- REVISÃO -------
  async function openReview(order) {
    setReviewStatus('')
    setReviewNotes('')
    setReviewError('')
    try {
      const execs = await fetchExecutions(order.id)
      setShowReview({ order, execution: execs[0] ?? null })
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleSaveReview() {
    if (!reviewStatus) {
      setReviewError('Selecione o resultado da revisão.')
      return
    }
    if (!showReview?.execution) {
      setReviewError('Nenhuma execução de corte encontrada para esta ordem.')
      return
    }

    setSavingReview(true)
    setReviewError('')
    try {
      await reviewExecution(showReview.execution.id, {
        review_status: reviewStatus,
        review_notes:  reviewNotes || null,
      })
      if (reviewStatus === 'aprovado') {
        await updateOrderStatus(showReview.order.id, 'aprovado')
        // Auto-baixar estoque: usa meters_used da execução (ou quantity_meters da ordem como fallback)
        const metersToDeduct = showReview.execution.meters_used ?? showReview.order.quantity_meters
        if (showReview.order.fabric_id && metersToDeduct) {
          try {
            await registerExit({
              fabricId:       showReview.order.fabric_id,
              quantity:       Number(metersToDeduct),
              cuttingOrderId: showReview.order.id,
              notes:          `Baixa automática — Ordem ${showReview.order.order_number}`,
            })
          } catch (exitErr) {
            // Aprovação já foi salva; avisa mas não reverte
            setReviewError(`Aprovado, mas falha ao baixar estoque: ${exitErr.message}`)
            setShowReview(null)
            loadAll()
            return
          }
        }
      }
      setShowReview(null)
      loadAll()
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setSavingReview(false)
    }
  }

  // ------- RENDER -------
  return (
    <div>
      <PageHeader>
        <PageTitle>Ordens de Corte</PageTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={loadAll}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          {canEdit && (
            <Button size="sm" onClick={openNewOrder}>
              <Plus size={14} /> Nova Ordem
            </Button>
          )}
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
            <FilterSelect
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FilterSelect>
          </Toolbar>
        </CardHeader>

        <CardBody css={{ px: 0, pb: 0 }}>
          {error && (
            <div style={{ padding: '16px', color: '#ef4444', fontSize: '0.875rem' }}>
              Erro: {error}
            </div>
          )}

          {loading ? (
            <EmptyState><p>Carregando ordens...</p></EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>
              <Scissors size={36} style={{ opacity: 0.3 }} />
              <p>{search || statusFilter ? 'Nenhuma ordem encontrada.' : 'Nenhuma ordem de corte cadastrada.'}</p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Nº Ordem</th>
                  <th>Tecido</th>
                  <th>Grade Planejada</th>
                  <th>Total Peças</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Prazo</th>
                  {canEdit && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id}>
                    <td><strong>{order.order_number}</strong></td>
                    <td>
                      {order.fabric
                        ? `${order.fabric.code} — ${order.fabric.description}`
                        : '—'}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>
                        {formatGradeString(order, 'qty_')}
                      </code>
                    </td>
                    <td>{order.total_pieces ?? '—'}</td>
                    <td>
                      <Badge color={STATUS_COLOR_MAP[order.status] ?? 'default'}>
                        {STATUS_LABEL_MAP[order.status] ?? order.status}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={PRIORITY_COLOR[order.priority] ?? 'default'}>
                        {PRIORITY_LABELS[order.priority] ?? order.priority}
                      </Badge>
                    </td>
                    <td>
                      {order.due_date
                        ? new Date(order.due_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(order.status === 'pendente' || order.status === 'em_corte') && (
                            <Button variant="outline" size="xs" onClick={() => openRegisterCut(order)}>
                              <Scissors size={12} /> Cortar
                            </Button>
                          )}
                          {order.status === 'cortado' && (
                            <Button variant="secondary" size="xs" onClick={() => openReview(order)}>
                              <CheckCircle size={12} /> Revisar
                            </Button>
                          )}
                          {order.status !== 'cancelado' && order.status !== 'aprovado' && (
                            <Button variant="ghost" size="xs" style={{ color: '#ef4444' }}
                              onClick={() => {
                                if (window.confirm(`Cancelar ordem ${order.order_number}?`)) {
                                  updateOrderStatus(order.id, 'cancelado').then(loadAll)
                                }
                              }}
                            >
                              <XCircle size={12} /> Cancelar
                            </Button>
                          )}
                          <Button variant="ghost" size="xs" onClick={() => generatePDF(order)}>
                            <Printer size={12} /> PDF
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal — Nova Ordem */}
      <Modal
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        title="Nova Ordem de Corte"
        size="lg"
      >
        {orderError && <ErrorBanner>{orderError}</ErrorBanner>}
        <FormGrid>
          <Input
            label="Nº da Ordem *"
            id="order_number"
            value={orderForm.order_number}
            onChange={e => setOrderField('order_number', e.target.value)}
            placeholder="ORD-2026-001"
          />
          <Select
            label="Prioridade"
            id="priority"
            value={orderForm.priority}
            onChange={e => setOrderField('priority', e.target.value)}
            options={PRIORITY_OPTIONS}
          />
          <FormRow>
            <Input
              label="Descrição"
              id="description"
              value={orderForm.description}
              onChange={e => setOrderField('description', e.target.value)}
              placeholder="Descrição da ordem..."
            />
          </FormRow>
          <FormRow>
            <Select
              label="Ficha Técnica"
              id="technical_sheet_id"
              value={orderForm.technical_sheet_id}
              onChange={e => handleSheetChange(e.target.value)}
              options={sheetOptions}
              placeholder="Selecione uma ficha técnica..."
            />
          </FormRow>
          <FormRow>
            <Select
              label="Tecido"
              id="fabric_id"
              value={orderForm.fabric_id}
              onChange={e => setOrderField('fabric_id', e.target.value)}
              options={fabricOptions}
              placeholder="Selecione um tecido..."
            />
          </FormRow>
          <Input
            label="Quantidade de Tecido (metros)"
            id="quantity_meters"
            type="number"
            min={0}
            step="0.01"
            value={orderForm.quantity_meters}
            onChange={e => setOrderField('quantity_meters', e.target.value)}
            placeholder="0,00"
          />
          <Input
            label="Prazo"
            id="due_date"
            type="date"
            value={orderForm.due_date}
            onChange={e => setOrderField('due_date', e.target.value)}
          />
          <FormRow>
            <GradeGrid
              label="Grade Planejada *"
              values={orderForm.grade}
              onChange={grade => setOrderField('grade', grade)}
            />
          </FormRow>
          <FormRow>
            <Input
              label="Observações"
              id="notes"
              value={orderForm.notes}
              onChange={e => setOrderField('notes', e.target.value)}
              placeholder="Notas adicionais..."
            />
          </FormRow>
        </FormGrid>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowNewOrder(false)} disabled={savingOrder}>
            Cancelar
          </Button>
          <Button onClick={handleSaveOrder} disabled={savingOrder}>
            {savingOrder ? 'Salvando...' : 'Criar Ordem'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal — Registrar Corte */}
      <Modal
        open={!!showRegisterCut}
        onClose={() => setShowRegisterCut(null)}
        title={`Registrar Corte — ${showRegisterCut?.order_number ?? ''}`}
        size="md"
      >
        {cutError && <ErrorBanner>{cutError}</ErrorBanner>}

        {showRegisterCut && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '0.875rem' }}>
            Grade planejada:{' '}
            <strong style={{ color: '#111827' }}>
              {formatGradeString(showRegisterCut, 'qty_')}
            </strong>
            {' '}({showRegisterCut.total_pieces ?? 0} peças)
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <GradeGrid
            label="Grade Efetiva *"
            values={cutGrade}
            onChange={setCutGrade}
          />
        </div>

        <Input
          label="Metros de Tecido Utilizados"
          id="meters_used"
          type="number"
          min={0}
          step="0.01"
          value={metersUsed}
          onChange={e => setMetersUsed(e.target.value)}
          placeholder="0,00"
        />

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowRegisterCut(null)} disabled={savingCut}>
            Cancelar
          </Button>
          <Button onClick={handleSaveCut} disabled={savingCut}>
            {savingCut ? 'Registrando...' : 'Registrar Corte'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal — Revisão de Qualidade */}
      <Modal
        open={!!showReview}
        onClose={() => setShowReview(null)}
        title={`Revisão de Qualidade — ${showReview?.order?.order_number ?? ''}`}
        size="md"
      >
        {reviewError && <ErrorBanner>{reviewError}</ErrorBanner>}

        {showReview?.execution && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '0.875rem' }}>
            Grade efetiva:{' '}
            <strong style={{ color: '#111827' }}>
              {formatGradeString(showReview.execution, 'actual_qty_')}
            </strong>
            {' '}({showReview.execution.actual_total ?? 0} peças)
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: '#111827' }}>
            Resultado da Revisão *
          </p>
          <ReviewRadioGroup>
            <label>
              <input
                type="radio"
                value="aprovado"
                checked={reviewStatus === 'aprovado'}
                onChange={e => setReviewStatus(e.target.value)}
              />
              Aprovado
            </label>
            <label>
              <input
                type="radio"
                value="reprovado"
                checked={reviewStatus === 'reprovado'}
                onChange={e => setReviewStatus(e.target.value)}
              />
              Reprovado
            </label>
          </ReviewRadioGroup>
        </div>

        <Input
          label="Observações da Revisão"
          id="review_notes"
          value={reviewNotes}
          onChange={e => setReviewNotes(e.target.value)}
          placeholder="Descreva problemas encontrados ou observações..."
        />

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowReview(null)} disabled={savingReview}>
            Cancelar
          </Button>
          <Button
            variant={reviewStatus === 'reprovado' ? 'danger' : 'primary'}
            onClick={handleSaveReview}
            disabled={savingReview}
          >
            {savingReview ? 'Salvando...' : 'Confirmar Revisão'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
