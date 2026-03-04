/**
 * FactionDispatches — Remessas para Facção com Retorno e Pagamento
 */
import { useEffect, useState } from 'react'
import { Plus, Search, RefreshCw, RotateCcw, DollarSign } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { useFaction } from '@/hooks/useFaction'
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
  flex: 1,
  minWidth: '200px',

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

// ------- COMPONENTE -------
export default function FactionDispatches() {
  const { isGestorFaccao, isAdmin } = useAuth()
  const {
    loading, error,
    fetchSeamstresses, fetchDispatches,
    createDispatch, registerReturn, registerPayment,
  } = useFaction()

  const [dispatches,   setDispatches]   = useState([])
  const [seamstresses, setSeamstresses] = useState([])
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payFilter,    setPayFilter]    = useState('')

  // Modais
  const [showNewDispatch, setShowNewDispatch] = useState(false)
  const [showReturn,      setShowReturn]      = useState(null) // dispatch
  const [showPayment,     setShowPayment]     = useState(null) // dispatch

  // Formulário Nova Remessa
  const [dispatchForm,  setDispatchForm]  = useState({
    dispatch_number: '',
    seamstress_id: '',
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

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [disp, seam] = await Promise.all([
      fetchDispatches(),
      fetchSeamstresses(),
    ])
    setDispatches(disp)
    setSeamstresses(seam)
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
      const seamstress = seamstresses.find(s => s.id === dispatchForm.seamstress_id)
      const pricePerPiece = Number(seamstress?.price_per_piece) || 0
      const paymentValue = pricePerPiece > 0 ? total * pricePerPiece : null

      await createDispatch({
        dispatch_number:      dispatchForm.dispatch_number.trim(),
        seamstress_id:        dispatchForm.seamstress_id,
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
                placeholder="Buscar por nº da remessa..."
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
                    <tr key={d.id}>
                      <td><strong>{d.dispatch_number}</strong></td>
                      <td>{d.seamstress?.name ?? '—'}</td>
                      <td>
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
                        <td>
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
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

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
              onChange={e => setDispatchField('seamstress_id', e.target.value)}
              options={seamstressOptions}
              placeholder="Selecione uma costureira..."
            />
          </FormRow>
          <FormRow>
            <GradeGrid
              label="Peças Enviadas *"
              values={dispatchForm.grade}
              onChange={grade => setDispatchField('grade', grade)}
            />
          </FormRow>
          <FormRow>
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
