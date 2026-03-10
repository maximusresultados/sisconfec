/**
 * CuttingOrders — Ordens de Corte com Execução e Revisão de Qualidade
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Search, RefreshCw, Scissors, CheckCircle, Printer, XCircle, Archive, ArchiveRestore } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { styled } from '@/styles/stitches.config'
import { useCuttingOrders } from '@/hooks/useCuttingOrders'
import { useInventory } from '@/hooks/useInventory'
import { useTechnicalSheets } from '@/hooks/useTechnicalSheets'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
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

const FABRIC_UNIT_OPTIONS = [
  { value: 'metro', label: 'metros' },
  { value: 'kg',    label: 'kg'     },
]

const EMPTY_GRADE = { pp: 0, p: 0, m: 0, g: 0, gg: 0, xgg: 0 }

const EMPTY_ORDER_FORM = {
  order_number:        '',
  description:         '',
  fabric_id:           '',
  technical_sheet_id:  '',
  quantity_meters:     '',
  fabric_quantity_unit: 'metro',
  grade:               { ...EMPTY_GRADE },
  priority:            'normal',
  due_date:            '',
  notes:               '',
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
  fontFamily: 'inherit',
  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 3px $colors$primary100',
  },
})

const FilterSelect = styled('select', {
  px: '$3',
  py: '$2',
  fontSize: '$sm',
  fontFamily: 'inherit',
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
  fontFamily: 'inherit',
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
    fontFamily: 'inherit',
  },
  td: {
    py: '$3',
    px: '$4',
    borderBottom: '1px solid $border',
    color: '$textPrimary',
    verticalAlign: 'middle',
    fontFamily: 'inherit',
    fontSize: '$sm',
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
    fontFamily: 'inherit',
  },
})

const ArchivedBadge = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: '0.7rem',
  color: '$textSecondary',
  backgroundColor: '$gray100',
  border: '1px solid $border',
  borderRadius: '$sm',
  px: '$2',
  py: '1px',
  ml: '$2',
})

// ------- SEARCHABLE SELECT -------
function SearchableSelect({ label, id, value, onChange, options = [], placeholder = 'Selecione ou busque...' }) {
  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const containerRef = useRef(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    !query || o.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleClickOutside = useCallback((e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setOpen(false)
      setQuery('')
    }
  }, [])

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label htmlFor={id} style={{
          display: 'block', fontSize: '0.8125rem', fontWeight: 500,
          color: 'var(--colors-textPrimary)', marginBottom: 4,
        }}>
          {label}
        </label>
      )}
      <input
        id={id}
        autoComplete="off"
        placeholder={open ? 'Digite para buscar...' : (selected ? '' : placeholder)}
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        style={{
          width: '100%', padding: '8px 12px', fontSize: '0.875rem',
          fontFamily: 'inherit',
          border: `1px solid ${open ? 'var(--colors-primary500)' : 'var(--colors-border)'}`,
          borderRadius: 6, outline: 'none', backgroundColor: 'var(--colors-surface)',
          color: 'var(--colors-textPrimary)', boxSizing: 'border-box',
          boxShadow: open ? '0 0 0 3px var(--colors-primary100)' : 'none',
        }}
      />
      {value && !open && (
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); onChange(''); setQuery('') }}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--colors-textDisabled)', fontSize: 16, lineHeight: 1,
            padding: '0 2px',
          }}
        >×</button>
      )}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          backgroundColor: 'var(--colors-surface)', border: '1px solid var(--colors-border)',
          borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '0.875rem', color: 'var(--colors-textSecondary)' }}>
              Nenhum resultado encontrado.
            </div>
          ) : filtered.map(o => (
            <div
              key={o.value}
              onMouseDown={e => { e.preventDefault(); onChange(o.value); setOpen(false); setQuery('') }}
              style={{
                padding: '8px 12px', fontSize: '0.875rem', cursor: 'pointer',
                fontFamily: 'inherit',
                backgroundColor: o.value === value ? 'var(--colors-primary50)' : 'transparent',
                color: o.value === value ? 'var(--colors-primary700)' : 'var(--colors-textPrimary)',
              }}
              onMouseOver={e => { if (o.value !== value) e.currentTarget.style.backgroundColor = 'var(--colors-gray50)' }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = o.value === value ? 'var(--colors-primary50)' : 'transparent' }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ------- COMPONENTE -------
export default function CuttingOrders() {
  const { isCortador, isAdmin, profile } = useAuth()
  const toast = useToast()
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
  const [showArchived, setShowArchived] = useState(false)

  // Modais
  const [showNewOrder,    setShowNewOrder]    = useState(false)
  const [showRegisterCut, setShowRegisterCut] = useState(null)
  const [showReview,      setShowReview]      = useState(null)

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

  const canEdit = isCortador?.() || isAdmin?.()

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

  const filtered = orders
    .filter(o => showArchived ? o.is_archived : !o.is_archived)
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
    label: `${f.code} — ${f.description}${f.color ? ` (${f.color})` : ''} [${f.current_stock?.toFixed(2) ?? 0} ${f.unit}]`,
    unit:  f.unit,
  }))

  const sheetOptions = sheets.map(s => ({
    value: s.id,
    label: `${s.product_code} — ${s.product_name}`,
  }))

  function setOrderField(key, value) {
    setOrderForm(f => ({ ...f, [key]: value }))
  }

  function handleSheetChange(sheetId) {
    setOrderField('technical_sheet_id', sheetId)
    if (sheetId) {
      const sheet = sheets.find(s => s.id === sheetId)
      if (sheet && !orderForm.description) {
        setOrderField('description', sheet.product_name)
      }
    }
  }

  function handleFabricChange(fabricId) {
    setOrderField('fabric_id', fabricId)
    if (fabricId) {
      const fabric = fabrics.find(f => f.id === fabricId)
      if (fabric?.unit) {
        setOrderField('fabric_quantity_unit', fabric.unit === 'kg' ? 'kg' : 'metro')
      }
    }
  }

  async function handleArchive(order) {
    const action = order.is_archived ? 'desarquivar' : 'arquivar'
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} a ordem ${order.order_number}?`)) return
    try {
      const { error } = await supabase
        .from('cutting_orders')
        .update({ is_archived: !order.is_archived })
        .eq('id', order.id)
        .eq('tenant_id', profile?.tenant_id)
      if (error) throw error
      toast?.success(`Ordem ${order.order_number} ${order.is_archived ? 'desarquivada' : 'arquivada'}.`)
      loadAll()
    } catch (err) {
      toast?.error(err.message)
    }
  }

  async function generatePDF(order) {
    const doc = new jsPDF()
    const margin = 14
    let y = 20

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
      const unit = order.fabric_quantity_unit === 'kg' ? 'kg' : 'metros'
      doc.text(`Quantidade: ${Number(order.quantity_meters).toLocaleString('pt-BR')} ${unit}`, margin, y)
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

    y += 4
    doc.setFont('helvetica', 'bold')
    doc.text('GRADE PLANEJADA', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const sizes = ['pp','p','m','g','gg','xgg']
    const labels = ['PP','P','M','G','GG','XGG']
    sizes.forEach((s, i) => {
      const qty = order[`qty_${s}`] ?? 0
      if (qty > 0) doc.text(`${labels[i]}: ${qty}`, margin + (i * 28), y)
    })
    y += 6
    doc.text(`Total: ${order.total_pieces ?? 0} peças`, margin, y)

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
        if (sheet.description) { doc.text(`Descrição: ${sheet.description}`, margin, y); y += 6 }
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
      } catch { /* ignora */ }
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
        order_number:         orderForm.order_number.trim(),
        description:          orderForm.description || null,
        fabric_id:            orderForm.fabric_id || null,
        technical_sheet_id:   orderForm.technical_sheet_id || null,
        quantity_meters:      orderForm.quantity_meters !== '' ? Number(orderForm.quantity_meters) : null,
        fabric_quantity_unit: orderForm.fabric_quantity_unit,
        priority:             orderForm.priority,
        due_date:             orderForm.due_date || null,
        notes:                orderForm.notes || null,
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

  const quantityLabel = orderForm.fabric_quantity_unit === 'kg'
    ? 'Quantidade de Tecido (kg)'
    : 'Quantidade de Tecido (metros)'

  // ------- RENDER -------
  return (
    <div>
      <PageHeader>
        <PageTitle>Ordens de Corte</PageTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={loadAll}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button
            variant={showArchived ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowArchived(v => !v)}
          >
            <Archive size={14} /> {showArchived ? 'Ver Ativas' : 'Ver Arquivadas'}
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
            <div style={{ padding: '16px', color: '#ef4444', fontSize: '0.875rem', fontFamily: 'inherit' }}>
              Erro: {error}
            </div>
          )}

          {loading ? (
            <EmptyState><p>Carregando ordens...</p></EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>
              <Scissors size={36} style={{ opacity: 0.3 }} />
              <p>
                {showArchived
                  ? 'Nenhuma ordem arquivada.'
                  : search || statusFilter
                    ? 'Nenhuma ordem encontrada.'
                    : 'Nenhuma ordem de corte cadastrada.'}
              </p>
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
                    <td>
                      <strong>{order.order_number}</strong>
                      {order.is_archived && (
                        <ArchivedBadge><Archive size={10} /> Arquivada</ArchivedBadge>
                      )}
                    </td>
                    <td>
                      {order.fabric
                        ? `${order.fabric.code} — ${order.fabric.description}`
                        : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--colors-textPrimary)' }}>
                        {formatGradeString(order, 'qty_')}
                      </span>
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
                          {!order.is_archived && (order.status === 'pendente' || order.status === 'em_corte') && (
                            <Button variant="outline" size="xs" onClick={() => openRegisterCut(order)}>
                              <Scissors size={12} /> Cortar
                            </Button>
                          )}
                          {!order.is_archived && order.status === 'cortado' && (
                            <Button variant="secondary" size="xs" onClick={() => openReview(order)}>
                              <CheckCircle size={12} /> Revisar
                            </Button>
                          )}
                          {!order.is_archived && order.status !== 'cancelado' && order.status !== 'aprovado' && (
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
                          {(order.status === 'aprovado' || order.status === 'cancelado') && (
                            <Button
                              variant={order.is_archived ? 'secondary' : 'ghost'}
                              size="xs"
                              onClick={() => handleArchive(order)}
                            >
                              {order.is_archived
                                ? <><ArchiveRestore size={12} /> Desarquivar</>
                                : <><Archive size={12} /> Arquivar</>
                              }
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
            <SearchableSelect
              label="Ficha Técnica"
              id="technical_sheet_id"
              value={orderForm.technical_sheet_id}
              onChange={handleSheetChange}
              options={sheetOptions}
              placeholder="Busque ou selecione uma ficha técnica..."
            />
          </FormRow>
          <FormRow>
            <SearchableSelect
              label="Tecido"
              id="fabric_id"
              value={orderForm.fabric_id}
              onChange={handleFabricChange}
              options={fabricOptions}
              placeholder="Busque ou selecione um tecido..."
            />
          </FormRow>
          <div>
            <Input
              label={quantityLabel}
              id="quantity_meters"
              type="number"
              min={0}
              step="0.01"
              value={orderForm.quantity_meters}
              onChange={e => setOrderField('quantity_meters', e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--colors-textPrimary)', marginBottom: 4 }}>
              Unidade
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {FABRIC_UNIT_OPTIONS.map(u => (
                <label key={u.value} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem',
                  border: `1px solid ${orderForm.fabric_quantity_unit === u.value ? 'var(--colors-primary500)' : 'var(--colors-border)'}`,
                  backgroundColor: orderForm.fabric_quantity_unit === u.value ? 'var(--colors-primary50)' : 'var(--colors-surface)',
                  color: orderForm.fabric_quantity_unit === u.value ? 'var(--colors-primary700)' : 'var(--colors-textPrimary)',
                  fontFamily: 'inherit',
                }}>
                  <input
                    type="radio"
                    name="fabric_quantity_unit"
                    value={u.value}
                    checked={orderForm.fabric_quantity_unit === u.value}
                    onChange={() => setOrderField('fabric_quantity_unit', u.value)}
                    style={{ display: 'none' }}
                  />
                  {u.label}
                </label>
              ))}
            </div>
          </div>
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
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}>
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
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}>
            Grade efetiva:{' '}
            <strong style={{ color: '#111827' }}>
              {formatGradeString(showReview.execution, 'actual_qty_')}
            </strong>
            {' '}({showReview.execution.actual_total ?? 0} peças)
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: '#111827', fontFamily: 'inherit' }}>
            Resultado da Revisão *
          </p>
          <ReviewRadioGroup>
            <label>
              <input type="radio" value="aprovado" checked={reviewStatus === 'aprovado'} onChange={e => setReviewStatus(e.target.value)} />
              Aprovado
            </label>
            <label>
              <input type="radio" value="reprovado" checked={reviewStatus === 'reprovado'} onChange={e => setReviewStatus(e.target.value)} />
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
