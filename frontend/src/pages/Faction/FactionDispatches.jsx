/**
 * FactionDispatches — Remessas para Facção com Retorno e Pagamento
 */
import { useEffect, useState } from 'react'
import { Plus, Search, RefreshCw, RotateCcw, DollarSign, ChevronRight } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { useFaction } from '@/hooks/useFaction'
import { useCuttingOrders } from '@/hooks/useCuttingOrders'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardBody } from '@/components/common/Card'
import { Badge, STATUS_COLOR_MAP, STATUS_LABEL_MAP } from '@/components/common/Badge'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { GradeGrid } from '@/components/common/GradeGrid'

// ------- CONSTANTES -------
const STATUS_OPTIONS = [
  { value: '',             label: 'Todos os status' },
  { value: 'enviado',      label: 'Enviado' },
  { value: 'em_producao',  label: 'Em Produção' },
  { value: 'retornado',    label: 'Retornado' },
  { value: 'pago',         label: 'Pago' },
  { value: 'cancelado',    label: 'Cancelado' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: '',        label: 'Todos os pagamentos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago',     label: 'Pago' },
]

const PAYMENT_STATUS_COLOR = {
  pendente: 'warning',
  pago:     'success',
}

const PAYMENT_STATUS_LABELS = {
  pendente: 'Pendente',
  pago:     'Pago',
}

const EMPTY_GRADE = { pp: 0, p: 0, m: 0, g: 0, gg: 0, xgg: 0 }

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

const InfoBox = styled('div', {
  padding: '$3 $4',
  backgroundColor: '$gray50',
  borderRadius: '$md',
  fontSize: '$sm',
  color: '$textSecondary',
  marginBottom: '$4',
  lineHeight: '$normal',
})

const ClickableRow = styled('tr', {
  cursor: 'pointer',
  '& td': { transition: 'background-color 0.15s' },
  '&:hover td': { backgroundColor: '$primary50 !important' },
})

const DetailKpiGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '$3',
  marginBottom: '$4',
})
const DetailKpi = styled('div', {
  textAlign: 'center',
  padding: '$3',
  backgroundColor: '$gray50',
  borderRadius: '$lg',
  '& .val': { fontSize: '$xl', fontWeight: '$bold', color: '$textPrimary', lineHeight: '1' },
  '& .lbl': { fontSize: '$xs', color: '$textSecondary', marginTop: '$1' },
})

const DetailRow = styled('div', {
  display: 'flex',
  gap: '$6',
  flexWrap: 'wrap',
  marginBottom: '$3',
})
const DetailField = styled('div', { minWidth: 120 })
const DetailLabel = styled('p', { fontSize: '$xs', color: '$textSecondary', marginBottom: '2px' })
const DetailValue = styled('p', { fontSize: '$sm', fontWeight: '$medium', color: '$textPrimary' })

const GradeCompare = styled('table', {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '$sm',
  marginBottom: '$4',
  th: {
    textAlign: 'center', py: '$2', px: '$3', fontSize: '$xs', fontWeight: '$semibold',
    color: '$textSecondary', textTransform: 'uppercase', borderBottom: '2px solid $border',
    backgroundColor: '$gray50',
  },
  td: {
    textAlign: 'center', py: '$2', px: '$3', borderBottom: '1px solid $border',
    fontVariantNumeric: 'tabular-nums', fontSize: '$sm',
  },
  'tr:last-child td': { borderBottom: 'none' },
  'td:first-child': { textAlign: 'left', fontWeight: '$medium', color: '$textSecondary' },
})

// ------- COMPONENTE -------
export default function FactionDispatches() {
  const { isGestorFaccao, isAdmin, profile } = useAuth()
  const tenantId = profile?.tenant_id
  const {
    loading, error,
    fetchSeamstresses, fetchDispatches,
    createDispatch, registerReturn, registerPayment,
  } = useFaction()
  const { fetchOrders, fetchExecutions } = useCuttingOrders()

  const [dispatches,     setDispatches]     = useState([])
  const [seamstresses,   setSeamstresses]   = useState([])
  const [cuttingOrders,  setCuttingOrders]  = useState([])
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [payFilter,      setPayFilter]      = useState('')

  // Detalhe
  const [detailDispatch, setDetailDispatch] = useState(null)

  // Modais
  const [showNewDispatch, setShowNewDispatch] = useState(false)
  const [showReturn,      setShowReturn]      = useState(null) // dispatch
  const [showPayment,     setShowPayment]     = useState(null) // dispatch

  // Formulário Nova Remessa
  const [dispatchForm,  setDispatchForm]  = useState({
    dispatch_number: '',
    seamstress_id: '',
    cutting_order_id: '',
    price_per_piece: '',
    grade: { ...EMPTY_GRADE },
    expected_return_date: '',
    notes: '',
  })
  const [dispatchError,  setDispatchError]  = useState('')
  const [savingDispatch, setSavingDispatch] = useState(false)

  // Formulário Retorno
  const [returnGrade,  setReturnGrade]  = useState({ ...EMPTY_GRADE })
  const [returnDate,   setReturnDate]   = useState('')
  const [returnError,  setReturnError]  = useState('')
  const [savingReturn, setSavingReturn] = useState(false)

  // Formulário Pagamento
  const [payForm,   setPayForm]   = useState({ payment_value: '', payment_date: '', payment_notes: '' })
  const [payError,  setPayError]  = useState('')
  const [savingPay, setSavingPay] = useState(false)

  const canManage = isGestorFaccao() || isAdmin()

  useEffect(() => {
    if (!tenantId) return
    loadAll()
  }, [tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    const [disp, seam, orders] = await Promise.all([
      fetchDispatches(),
      fetchSeamstresses(),
      fetchOrders({ status: 'aprovado' }),
    ])
    setDispatches(disp)
    setSeamstresses(seam)
    setCuttingOrders(orders)
  }

  // Filtra localmente
  const filtered = dispatches
    .filter(d => !search || d.dispatch_number.toLowerCase().includes(search.toLowerCase()))
    .filter(d => !statusFilter || d.status === statusFilter)
    .filter(d => !payFilter    || d.payment_status === payFilter)

  const seamstressOptions = seamstresses.map(s => ({
    value: s.id,
    label: s.name,
  }))

  // Gera número de remessa sugerido
  const year = new Date().getFullYear()
  const nextSeq = String(dispatches.length + 1).padStart(3, '0')
  const suggestedNumber = `FAC-${year}-${nextSeq}`

  // ------- NOVA REMESSA -------
  function openNewDispatch() {
    setDispatchForm({
      dispatch_number: suggestedNumber,
      seamstress_id: '',
      cutting_order_id: '',
      price_per_piece: '',
      grade: { ...EMPTY_GRADE },
      expected_return_date: '',
      notes: '',
    })
    setDispatchError('')
    setShowNewDispatch(true)
  }

  function setDispatchField(key, value) {
    setDispatchForm(f => ({ ...f, [key]: value }))
  }

  async function handleCuttingOrderChange(orderId) {
    setDispatchField('cutting_order_id', orderId)
    if (!orderId) return
    try {
      const execs = await fetchExecutions(orderId)
      const exec  = execs[0]
      if (exec) {
        setDispatchForm(f => ({
          ...f,
          cutting_order_id: orderId,
          grade: {
            pp:  exec.actual_qty_pp  || 0,
            p:   exec.actual_qty_p   || 0,
            m:   exec.actual_qty_m   || 0,
            g:   exec.actual_qty_g   || 0,
            gg:  exec.actual_qty_gg  || 0,
            xgg: exec.actual_qty_xgg || 0,
          },
        }))
      }
    } catch {
      // se falhar, mantém grade manual
    }
  }

  function handleSeamstressChange(seamstressId) {
    const seam = seamstresses.find(s => s.id === seamstressId)
    setDispatchForm(f => ({
      ...f,
      seamstress_id:  seamstressId,
      price_per_piece: seam?.price_per_piece != null ? String(seam.price_per_piece) : '',
    }))
  }

  // Calcula payment_value a partir do preço por peça e total da grade
  const dispatchTotal       = Object.values(dispatchForm.grade).reduce((a, v) => a + (Number(v) || 0), 0)
  const dispatchPriceNum    = Number(dispatchForm.price_per_piece) || 0
  const dispatchPaymentCalc = dispatchPriceNum > 0 ? (dispatchTotal * dispatchPriceNum).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'

  async function handleSaveDispatch() {
    if (!dispatchForm.dispatch_number.trim()) {
      setDispatchError('O número da remessa é obrigatório.')
      return
    }
    if (!dispatchForm.seamstress_id) {
      setDispatchError('Selecione uma costureira.')
      return
    }
    const total = Object.values(dispatchForm.grade).reduce((a, v) => a + (Number(v) || 0), 0)
    if (total === 0) {
      setDispatchError('Informe pelo menos 1 peça na grade.')
      return
    }

    setSavingDispatch(true)
    setDispatchError('')
    try {
      const pricePerPiece = Number(dispatchForm.price_per_piece) || 0
      const paymentValue  = pricePerPiece > 0 ? total * pricePerPiece : null

      await createDispatch({
        dispatch_number:      dispatchForm.dispatch_number.trim(),
        seamstress_id:        dispatchForm.seamstress_id,
        cutting_order_id:     dispatchForm.cutting_order_id || null,
        expected_return_date: dispatchForm.expected_return_date || null,
        notes:                dispatchForm.notes || null,
        status:               'enviado',
        payment_status:       'pendente',
        payment_value:        paymentValue,
        qty_pp_sent:  dispatchForm.grade.pp  || 0,
        qty_p_sent:   dispatchForm.grade.p   || 0,
        qty_m_sent:   dispatchForm.grade.m   || 0,
        qty_g_sent:   dispatchForm.grade.g   || 0,
        qty_gg_sent:  dispatchForm.grade.gg  || 0,
        qty_xgg_sent: dispatchForm.grade.xgg || 0,
      })
      setShowNewDispatch(false)
      loadAll()
    } catch (err) {
      setDispatchError(err.message)
    } finally {
      setSavingDispatch(false)
    }
  }

  // ------- REGISTRAR RETORNO -------
  function openReturn(dispatch) {
    setReturnGrade({ ...EMPTY_GRADE })
    setReturnDate(new Date().toISOString().split('T')[0])
    setReturnError('')
    setShowReturn(dispatch)
  }

  // Máximo retornável por tamanho = enviado
  const maxReturnGrade = showReturn ? {
    pp:  showReturn.qty_pp_sent  || 0,
    p:   showReturn.qty_p_sent   || 0,
    m:   showReturn.qty_m_sent   || 0,
    g:   showReturn.qty_g_sent   || 0,
    gg:  showReturn.qty_gg_sent  || 0,
    xgg: showReturn.qty_xgg_sent || 0,
  } : {}

  async function handleSaveReturn() {
    const total = Object.values(returnGrade).reduce((a, v) => a + (Number(v) || 0), 0)
    if (total === 0) {
      setReturnError('Informe pelo menos 1 peça retornada.')
      return
    }

    setSavingReturn(true)
    setReturnError('')
    try {
      await registerReturn(showReturn.id, {
        returned_at:        returnDate || null,
        qty_pp_returned:    returnGrade.pp  || 0,
        qty_p_returned:     returnGrade.p   || 0,
        qty_m_returned:     returnGrade.m   || 0,
        qty_g_returned:     returnGrade.g   || 0,
        qty_gg_returned:    returnGrade.gg  || 0,
        qty_xgg_returned:   returnGrade.xgg || 0,
      })
      setShowReturn(null)
      loadAll()
    } catch (err) {
      setReturnError(err.message)
    } finally {
      setSavingReturn(false)
    }
  }

  // ------- REGISTRAR PAGAMENTO -------
  function openPayment(dispatch) {
    const seam = seamstresses.find(s => s.id === dispatch.seamstress_id)
    const pricePerPiece = seam?.price_per_piece ?? dispatch.seamstress?.price_per_piece ?? 0
    const suggested = pricePerPiece > 0 && dispatch.total_returned > 0
      ? (Number(pricePerPiece) * Number(dispatch.total_returned)).toFixed(2)
      : ''

    setPayForm({
      payment_value: suggested,
      payment_date:  new Date().toISOString().split('T')[0],
      payment_notes: '',
    })
    setPayError('')
    setShowPayment(dispatch)
  }

  async function handleSavePayment() {
    if (!payForm.payment_value || Number(payForm.payment_value) <= 0) {
      setPayError('Informe o valor do pagamento.')
      return
    }

    setSavingPay(true)
    setPayError('')
    try {
      await registerPayment(showPayment.id, {
        payment_value: Number(payForm.payment_value),
        payment_date:  payForm.payment_date || null,
        payment_notes: payForm.payment_notes || null,
      })
      setShowPayment(null)
      loadAll()
    } catch (err) {
      setPayError(err.message)
    } finally {
      setSavingPay(false)
    }
  }

  // Calcula saldo (enviado - retornado)
  function calcBalance(d) {
    const sent     = Number(d.total_sent)     || 0
    const returned = Number(d.total_returned) || 0
    return sent - returned
  }

  // ------- RENDER -------
  return (
    <div>
      <PageHeader>
        <PageTitle>Remessas para Facção</PageTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={loadAll}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          {canManage && (
            <Button size="sm" onClick={openNewDispatch}>
              <Plus size={14} /> Nova Remessa
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
            <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={payFilter} onChange={e => setPayFilter(e.target.value)}>
              {PAYMENT_STATUS_OPTIONS.map(o => (
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
            <EmptyState><p>Carregando remessas...</p></EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>
              <p>{search || statusFilter ? 'Nenhuma remessa encontrada.' : 'Nenhuma remessa cadastrada.'}</p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Nº Remessa</th>
                  <th>Costureira</th>
                  <th>Data Envio</th>
                  <th>Enviado</th>
                  <th>Retornado</th>
                  <th>Saldo</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  {canManage && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const balance = calcBalance(d)
                  return (
                    <ClickableRow key={d.id} onClick={() => setDetailDispatch(d)}>
                      <td><strong>{d.dispatch_number}</strong></td>
                      <td>{d.seamstress?.name ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {d.created_at
                          ? new Date(d.created_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td>{d.total_sent ?? 0}</td>
                      <td>{d.total_returned ?? 0}</td>
                      <td>
                        <span style={{ color: balance > 0 ? '#b45309' : '#15803d', fontWeight: 600 }}>
                          {balance}
                        </span>
                      </td>
                      <td>
                        <Badge color={STATUS_COLOR_MAP[d.status] ?? 'default'}>
                          {STATUS_LABEL_MAP[d.status] ?? d.status}
                        </Badge>
                      </td>
                      <td>
                        <Badge color={PAYMENT_STATUS_COLOR[d.payment_status] ?? 'default'}>
                          {PAYMENT_STATUS_LABELS[d.payment_status] ?? d.payment_status}
                        </Badge>
                      </td>
                      {canManage && (
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(d.status === 'enviado' || d.status === 'em_producao') && (
                              <Button variant="secondary" size="xs" onClick={() => openReturn(d)}>
                                <RotateCcw size={12} /> Retorno
                              </Button>
                            )}
                            {d.status === 'retornado' && d.payment_status === 'pendente' && (
                              <Button variant="success" size="xs" onClick={() => openPayment(d)}>
                                <DollarSign size={12} /> Pagar
                              </Button>
                            )}
                            {d.status !== 'enviado' && d.status !== 'em_producao' && d.payment_status !== 'pendente' && (
                              <ChevronRight size={13} style={{ color: '#d1d5db' }} />
                            )}
                          </div>
                        </td>
                      )}
                    </ClickableRow>
                  )
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* ======== MODAL DETALHE REMESSA ======== */}
      {detailDispatch && (() => {
        const d       = detailDispatch
        const balance = calcBalance(d)
        const sizes   = ['PP','P','M','G','GG','XGG']
        const sentVals     = [d.qty_pp_sent,d.qty_p_sent,d.qty_m_sent,d.qty_g_sent,d.qty_gg_sent,d.qty_xgg_sent]
        const returnedVals = [d.qty_pp_returned,d.qty_p_returned,d.qty_m_returned,d.qty_g_returned,d.qty_gg_returned,d.qty_xgg_returned]
        const hasSizes = sentVals.some(v => (v ?? 0) > 0)

        return (
          <Modal
            open={!!detailDispatch}
            onClose={() => setDetailDispatch(null)}
            title={`Remessa ${d.dispatch_number}`}
            size="lg"
          >
            {/* KPIs */}
            <DetailKpiGrid>
              <DetailKpi>
                <div className="val">{d.total_sent ?? 0}</div>
                <div className="lbl">Peças Enviadas</div>
              </DetailKpi>
              <DetailKpi>
                <div className="val">{d.total_returned ?? 0}</div>
                <div className="lbl">Peças Retornadas</div>
              </DetailKpi>
              <DetailKpi>
                <div className="val" style={{ color: balance > 0 ? '#b45309' : '#15803d' }}>{balance}</div>
                <div className="lbl">Saldo em Aberto</div>
              </DetailKpi>
            </DetailKpiGrid>

            {/* Dados */}
            <DetailRow>
              <DetailField>
                <DetailLabel>Costureira</DetailLabel>
                <DetailValue>{d.seamstress?.name ?? '—'}</DetailValue>
              </DetailField>
              <DetailField>
                <DetailLabel>Data de Envio</DetailLabel>
                <DetailValue>{d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—'}</DetailValue>
              </DetailField>
              {d.expected_return_date && (
                <DetailField>
                  <DetailLabel>Previsão Retorno</DetailLabel>
                  <DetailValue>{new Date(d.expected_return_date + 'T00:00:00').toLocaleDateString('pt-BR')}</DetailValue>
                </DetailField>
              )}
              {d.returned_at && (
                <DetailField>
                  <DetailLabel>Data Retorno</DetailLabel>
                  <DetailValue>{new Date(d.returned_at).toLocaleDateString('pt-BR')}</DetailValue>
                </DetailField>
              )}
              <DetailField>
                <DetailLabel>Status</DetailLabel>
                <DetailValue>
                  <Badge color={STATUS_COLOR_MAP[d.status] ?? 'default'}>
                    {STATUS_LABEL_MAP[d.status] ?? d.status}
                  </Badge>
                </DetailValue>
              </DetailField>
              <DetailField>
                <DetailLabel>Pagamento</DetailLabel>
                <DetailValue>
                  <Badge color={PAYMENT_STATUS_COLOR[d.payment_status] ?? 'default'}>
                    {PAYMENT_STATUS_LABELS[d.payment_status] ?? d.payment_status}
                  </Badge>
                </DetailValue>
              </DetailField>
              {d.payment_value != null && (
                <DetailField>
                  <DetailLabel>Valor Pago</DetailLabel>
                  <DetailValue style={{ color: '#15803d' }}>
                    R$ {Number(d.payment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </DetailValue>
                </DetailField>
              )}
              {d.payment_date && (
                <DetailField>
                  <DetailLabel>Data Pagamento</DetailLabel>
                  <DetailValue>{new Date(d.payment_date).toLocaleDateString('pt-BR')}</DetailValue>
                </DetailField>
              )}
            </DetailRow>

            {/* Grade por tamanho */}
            {hasSizes && (
              <GradeCompare>
                <thead>
                  <tr>
                    <th></th>
                    {sizes.map(s => <th key={s}>{s}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Enviado</td>
                    {sentVals.map((v, i) => <td key={i}>{v ?? 0}</td>)}
                    <td style={{ fontWeight: 600 }}>{d.total_sent ?? 0}</td>
                  </tr>
                  {(d.total_returned ?? 0) > 0 && (
                    <tr>
                      <td>Retornado</td>
                      {returnedVals.map((v, i) => <td key={i}>{v ?? 0}</td>)}
                      <td style={{ fontWeight: 600 }}>{d.total_returned ?? 0}</td>
                    </tr>
                  )}
                </tbody>
              </GradeCompare>
            )}

            {/* Observações */}
            {d.notes && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280', padding: '8px 12px', background: 'var(--colors-gray50)', borderRadius: 8 }}>
                <strong style={{ color: '#374151' }}>Obs:</strong> {d.notes}
              </div>
            )}

            <ModalFooter>
              <Button variant="ghost" onClick={() => setDetailDispatch(null)}>Fechar</Button>
              {canManage && (d.status === 'enviado' || d.status === 'em_producao') && (
                <Button variant="secondary" size="sm" onClick={() => { setDetailDispatch(null); openReturn(d) }}>
                  <RotateCcw size={14} /> Registrar Retorno
                </Button>
              )}
              {canManage && d.status === 'retornado' && d.payment_status === 'pendente' && (
                <Button variant="success" size="sm" onClick={() => { setDetailDispatch(null); openPayment(d) }}>
                  <DollarSign size={14} /> Registrar Pagamento
                </Button>
              )}
            </ModalFooter>
          </Modal>
        )
      })()}

      {/* Modal — Nova Remessa */}
      <Modal
        open={showNewDispatch}
        onClose={() => setShowNewDispatch(false)}
        title="Nova Remessa para Facção"
        size="lg"
      >
        {dispatchError && <ErrorBanner>{dispatchError}</ErrorBanner>}
        <FormGrid>
          <Input
            label="Nº da Remessa *"
            id="dispatch_number"
            value={dispatchForm.dispatch_number}
            onChange={e => setDispatchField('dispatch_number', e.target.value)}
            placeholder={suggestedNumber}
          />
          <Input
            label="Previsão de Retorno"
            id="expected_return_date"
            type="date"
            value={dispatchForm.expected_return_date}
            onChange={e => setDispatchField('expected_return_date', e.target.value)}
          />
          <FormRow>
            <Select
              label="Costureira *"
              id="seamstress_id"
              value={dispatchForm.seamstress_id}
              onChange={e => handleSeamstressChange(e.target.value)}
              options={seamstressOptions}
              placeholder="Selecione uma costureira..."
            />
          </FormRow>
          <FormRow>
            <Select
              label="Ordem de Corte"
              id="cutting_order_id"
              value={dispatchForm.cutting_order_id}
              onChange={e => handleCuttingOrderChange(e.target.value)}
              options={cuttingOrders.map(o => ({ value: o.id, label: `${o.order_number}${o.description ? ` — ${o.description}` : ''} (${o.total_pieces ?? 0} peças)` }))}
              placeholder="Selecione para auto-preencher a grade..."
            />
          </FormRow>
          <FormRow>
            <GradeGrid
              label="Peças Enviadas *"
              values={dispatchForm.grade}
              onChange={grade => setDispatchField('grade', grade)}
            />
          </FormRow>
          <Input
            label="Valor por Peça (R$)"
            id="price_per_piece"
            type="number"
            min={0}
            step="0.01"
            value={dispatchForm.price_per_piece}
            onChange={e => setDispatchField('price_per_piece', e.target.value)}
            placeholder="0,00"
            hint={dispatchForm.price_per_piece ? `Total estimado: R$ ${dispatchPaymentCalc}` : 'Deixe em branco se não aplicável'}
          />
          <FormRow style={{ marginBottom: '8px' }}>
            <Input
              label="Observações"
              id="dispatch_notes"
              value={dispatchForm.notes}
              onChange={e => setDispatchField('notes', e.target.value)}
              placeholder="Notas adicionais..."
            />
          </FormRow>
        </FormGrid>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowNewDispatch(false)} disabled={savingDispatch}>
            Cancelar
          </Button>
          <Button onClick={handleSaveDispatch} disabled={savingDispatch}>
            {savingDispatch ? 'Salvando...' : 'Criar Remessa'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal — Registrar Retorno */}
      <Modal
        open={!!showReturn}
        onClose={() => setShowReturn(null)}
        title={`Registrar Retorno — ${showReturn?.dispatch_number ?? ''}`}
        size="md"
      >
        {returnError && <ErrorBanner>{returnError}</ErrorBanner>}

        {showReturn && (
          <InfoBox>
            Costureira: <strong style={{ color: '#111827' }}>{showReturn.seamstress?.name ?? '—'}</strong>
            <br />
            Enviado: <strong style={{ color: '#111827' }}>
              {[
                showReturn.qty_pp_sent  > 0 && `PP:${showReturn.qty_pp_sent}`,
                showReturn.qty_p_sent   > 0 && `P:${showReturn.qty_p_sent}`,
                showReturn.qty_m_sent   > 0 && `M:${showReturn.qty_m_sent}`,
                showReturn.qty_g_sent   > 0 && `G:${showReturn.qty_g_sent}`,
                showReturn.qty_gg_sent  > 0 && `GG:${showReturn.qty_gg_sent}`,
                showReturn.qty_xgg_sent > 0 && `XGG:${showReturn.qty_xgg_sent}`,
              ].filter(Boolean).join(' ') || `${showReturn.total_sent ?? 0} peças`}
            </strong>
          </InfoBox>
        )}

        <div style={{ marginBottom: '16px' }}>
          <GradeGrid
            label="Peças Retornadas *"
            values={returnGrade}
            onChange={setReturnGrade}
            maxValues={maxReturnGrade}
          />
        </div>

        <Input
          label="Data de Retorno"
          id="returned_at"
          type="date"
          value={returnDate}
          onChange={e => setReturnDate(e.target.value)}
        />

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowReturn(null)} disabled={savingReturn}>
            Cancelar
          </Button>
          <Button onClick={handleSaveReturn} disabled={savingReturn}>
            {savingReturn ? 'Registrando...' : 'Registrar Retorno'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal — Registrar Pagamento */}
      <Modal
        open={!!showPayment}
        onClose={() => setShowPayment(null)}
        title={`Registrar Pagamento — ${showPayment?.dispatch_number ?? ''}`}
        size="sm"
      >
        {payError && <ErrorBanner>{payError}</ErrorBanner>}

        {showPayment && (
          <InfoBox>
            Costureira: <strong style={{ color: '#111827' }}>{showPayment.seamstress?.name ?? '—'}</strong>
            <br />
            Peças retornadas: <strong style={{ color: '#111827' }}>{showPayment.total_returned ?? 0}</strong>
          </InfoBox>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Valor do Pagamento (R$) *"
            id="payment_value"
            type="number"
            min={0}
            step="0.01"
            value={payForm.payment_value}
            onChange={e => setPayForm(f => ({ ...f, payment_value: e.target.value }))}
            placeholder="0,00"
          />
          <Input
            label="Data do Pagamento"
            id="payment_date"
            type="date"
            value={payForm.payment_date}
            onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
          />
          <Input
            label="Observações"
            id="payment_notes"
            value={payForm.payment_notes}
            onChange={e => setPayForm(f => ({ ...f, payment_notes: e.target.value }))}
            placeholder="Forma de pagamento, referência..."
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowPayment(null)} disabled={savingPay}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleSavePayment} disabled={savingPay}>
            {savingPay ? 'Registrando...' : 'Registrar Pagamento'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
