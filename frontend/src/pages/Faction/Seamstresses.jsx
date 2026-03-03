/**
 * Seamstresses — Cadastro e gestão de costureiras
 */
import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, UserX, RefreshCw } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { useFaction } from '@/hooks/useFaction'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'

// ------- CONSTANTES -------
const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
].map(uf => ({ value: uf, label: uf }))

const PAYMENT_TYPES = [
  { value: 'por_peca', label: 'Por Peça' },
  { value: 'por_hora', label: 'Por Hora' },
  { value: 'fixo',     label: 'Fixo Mensal' },
]

const PAYMENT_TYPE_LABELS = {
  por_peca: 'Por Peça',
  por_hora: 'Por Hora',
  fixo:     'Fixo',
}

const EMPTY_FORM = {
  name: '', document: '', phone: '', whatsapp: '',
  address: '', city: '', state: '', payment_type: 'por_peca',
  price_per_piece: '', notes: '',
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
  flex: 1,
  minWidth: '240px',

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

const KpiGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '$4',
  marginBottom: '$6',
})

const KpiCard = styled('div', {
  backgroundColor: '$surface',
  border: '1px solid $border',
  borderRadius: '$xl',
  padding: '$5',
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
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: '$textPrimary',
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

// ------- COMPONENTE -------
export default function Seamstresses() {
  const { isAdmin, isGestorFaccao } = useAuth()
  const {
    loading, error,
    fetchSeamstresses, fetchSeamstressSummary,
    createSeamstress, updateSeamstress, deactivateSeamstress,
  } = useFaction()

  const [seamstresses, setSeamstresses] = useState([])
  const [summary,      setSummary]      = useState([])
  const [search,       setSearch]       = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [formError,    setFormError]    = useState('')
  const [saving,       setSaving]       = useState(false)

  const canManage = isAdmin() || isGestorFaccao()

  useEffect(() => { load() }, [])

  async function load() {
    const [rows, summ] = await Promise.all([
      fetchSeamstresses(),
      fetchSeamstressSummary().catch(() => []),
    ])
    setSeamstresses(rows)
    setSummary(summ)
  }

  const filtered = seamstresses.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const kpiTotalSent     = summary.reduce((a, s) => a + (Number(s.total_sent)     || 0), 0)
  const kpiTotalReturned = summary.reduce((a, s) => a + (Number(s.total_returned) || 0), 0)
  const kpiTotalPending  = summary.reduce((a, s) => a + (Number(s.pending_payment)|| 0), 0)

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(row) {
    setEditing(row)
    setForm({
      name:           row.name ?? '',
      document:       row.document ?? '',
      phone:          row.phone ?? '',
      whatsapp:       row.whatsapp ?? '',
      address:        row.address ?? '',
      city:           row.city ?? '',
      state:          row.state ?? '',
      payment_type:   row.payment_type ?? 'por_peca',
      price_per_piece: row.price_per_piece != null ? String(row.price_per_piece) : '',
      notes:          row.notes ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
  }

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('O nome é obrigatório.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        ...form,
        price_per_piece: form.price_per_piece !== '' ? Number(form.price_per_piece) : null,
      }
      if (editing) {
        await updateSeamstress(editing.id, payload)
      } else {
        await createSeamstress(payload)
      }
      closeModal()
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(row) {
    if (!window.confirm(`Desativar a costureira "${row.name}"?`)) return
    try {
      await deactivateSeamstress(row.id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  function getSummaryFor(id) {
    return summary.find(s => s.seamstress_id === id) ?? null
  }

  return (
    <div>
      <PageHeader>
        <PageTitle>Costureiras</PageTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          {canManage && (
            <Button size="sm" onClick={openNew}>
              <Plus size={14} /> Nova Costureira
            </Button>
          )}
        </div>
      </PageHeader>

      {/* KPIs */}
      <KpiGrid>
        <KpiCard>
          <KpiLabel>Total Enviado</KpiLabel>
          <KpiValue>{kpiTotalSent.toLocaleString('pt-BR')} peças</KpiValue>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Total Retornado</KpiLabel>
          <KpiValue>{kpiTotalReturned.toLocaleString('pt-BR')} peças</KpiValue>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Valor Pendente</KpiLabel>
          <KpiValue>
            R$ {kpiTotalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </KpiValue>
        </KpiCard>
      </KpiGrid>

      <Card padding="none">
        <CardHeader css={{ px: '$4', pt: '$4', pb: '0', borderBottom: 'none' }}>
          <Toolbar>
            <SearchWrapper>
              <Search />
              <SearchInput
                placeholder="Buscar por nome ou cidade..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </SearchWrapper>
          </Toolbar>
        </CardHeader>

        <CardBody css={{ px: 0, pb: 0 }}>
          {error && (
            <div style={{ padding: '16px', color: '#ef4444', fontSize: '0.875rem' }}>
              Erro: {error}
            </div>
          )}

          {loading ? (
            <EmptyState><p>Carregando costureiras...</p></EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>
              <p>{search ? 'Nenhuma costureira encontrada.' : 'Nenhuma costureira cadastrada.'}</p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>WhatsApp</th>
                  <th>Cidade/UF</th>
                  <th>Pagamento</th>
                  <th>R$/Peça</th>
                  <th>Remessas</th>
                  <th>Pendente (R$)</th>
                  {canManage && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const summ = getSummaryFor(row.id)
                  return (
                    <tr key={row.id}>
                      <td><strong>{row.name}</strong></td>
                      <td>{row.document || '—'}</td>
                      <td>{row.whatsapp || row.phone || '—'}</td>
                      <td>{row.city ? `${row.city}/${row.state}` : '—'}</td>
                      <td>
                        <Badge color="default">
                          {PAYMENT_TYPE_LABELS[row.payment_type] ?? row.payment_type}
                        </Badge>
                      </td>
                      <td>
                        {row.price_per_piece != null
                          ? `R$ ${Number(row.price_per_piece).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td>{summ?.total_dispatches ?? 0}</td>
                      <td>
                        {summ?.pending_payment != null
                          ? `R$ ${Number(summ.pending_payment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      {canManage && (
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="ghost" size="xs" onClick={() => openEdit(row)}>
                              <Edit2 size={12} /> Editar
                            </Button>
                            {isAdmin() && (
                              <Button variant="ghost" size="xs" onClick={() => handleDeactivate(row)}>
                                <UserX size={12} /> Desativar
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

      {/* Modal Criar/Editar */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editing ? 'Editar Costureira' : 'Nova Costureira'}
        size="lg"
      >
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <FormGrid>
          <FormRow>
            <Input
              label="Nome *"
              id="name"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Nome completo"
            />
          </FormRow>

          <Input
            label="Documento (CPF/CNPJ)"
            id="document"
            value={form.document}
            onChange={e => setField('document', e.target.value)}
            placeholder="000.000.000-00"
          />
          <Input
            label="Telefone"
            id="phone"
            value={form.phone}
            onChange={e => setField('phone', e.target.value)}
            placeholder="(00) 00000-0000"
          />
          <Input
            label="WhatsApp"
            id="whatsapp"
            value={form.whatsapp}
            onChange={e => setField('whatsapp', e.target.value)}
            placeholder="(00) 00000-0000"
          />
          <Input
            label="Cidade"
            id="city"
            value={form.city}
            onChange={e => setField('city', e.target.value)}
            placeholder="Cidade"
          />
          <FormRow>
            <Input
              label="Endereço"
              id="address"
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              placeholder="Rua, número, bairro"
            />
          </FormRow>

          <Select
            label="Estado"
            id="state"
            value={form.state}
            onChange={e => setField('state', e.target.value)}
            options={STATES_BR}
            placeholder="Selecione..."
          />
          <Select
            label="Tipo de Pagamento"
            id="payment_type"
            value={form.payment_type}
            onChange={e => setField('payment_type', e.target.value)}
            options={PAYMENT_TYPES}
          />
          <Input
            label="Valor por Peça (R$)"
            id="price_per_piece"
            type="number"
            min={0}
            step="0.01"
            value={form.price_per_piece}
            onChange={e => setField('price_per_piece', e.target.value)}
            placeholder="0,00"
          />

          <FormRow>
            <Input
              label="Observações"
              id="notes"
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Notas adicionais..."
            />
          </FormRow>
        </FormGrid>

        <ModalFooter>
          <Button variant="secondary" onClick={closeModal} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Cadastrar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
