/**
 * InventoryList — Lista de tecidos com modais de cadastro, entrada e saída
 */
import { useEffect, useState } from 'react'
import { Plus, Search, RefreshCw, AlertTriangle, Package, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, ChevronRight, RotateCcw } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useInventory } from '@/hooks/useInventory'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SkeletonTable } from '@/components/common/Skeleton'
import { Pagination, usePagination } from '@/components/common/Pagination'

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
  pl: '$8',
  pr: '$3',
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

  '&::placeholder': { color: '$textDisabled' },
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

const StockBar = styled('div', {
  width: '100%',
  height: '6px',
  borderRadius: '$full',
  backgroundColor: '$gray200',
  overflow: 'hidden',

  '& .fill': {
    height: '100%',
    borderRadius: '$full',
    transition: 'width 0.3s ease',
  },
})

const EmptyState = styled('div', {
  textAlign: 'center',
  py: '$12',
  color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const MonoCell = styled('td', {
  fontVariantNumeric: 'tabular-nums',
  fontSize: '$sm',
})

// Linha clicável da tabela (exclui coluna de ações via stopPropagation)
const ClickableRow = styled('tr', {
  cursor: 'pointer',
  '& td': { transition: 'background-color $fast' },
  '&:hover td': { backgroundColor: '$primary50 !important' },
})

// Modal de detalhes — seções e campos
const DetailSection = styled('div', {
  '& + &': { marginTop: '$5', paddingTop: '$5', borderTop: '1px solid $border' },
})

const DetailSectionTitle = styled('p', {
  fontSize: '$xs',
  fontWeight: '$semibold',
  color: '$textSecondary',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '$3',
})

const DetailGrid = styled('div', {
  display: 'grid',
  gap: '$3',
  variants: {
    cols: {
      2: { gridTemplateColumns: '1fr 1fr' },
      3: { gridTemplateColumns: '1fr 1fr 1fr' },
    },
  },
  defaultVariants: { cols: 2 },
})

const DetailField = styled('div', {})
const DetailLabel = styled('p', { fontSize: '$xs', color: '$textSecondary', marginBottom: '2px' })
const DetailValue = styled('p', { fontSize: '$sm', fontWeight: '$medium', color: '$textPrimary' })

const StockSummary = styled('div', {
  display: 'flex',
  gap: '$4',
  padding: '$4',
  borderRadius: '$lg',
  backgroundColor: '$gray50',
  marginBottom: '$4',
  flexWrap: 'wrap',
})

const StockFigure = styled('div', {
  flex: 1,
  minWidth: '80px',
  '& .val': { fontSize: '$xl', fontWeight: '$bold', color: '$textPrimary', lineHeight: '$tight' },
  '& .lbl': { fontSize: '$xs', color: '$textSecondary', marginTop: '2px' },
})

const FormGrid = styled('div', {
  display: 'grid',
  gap: '$4',
  variants: {
    cols: {
      2: { gridTemplateColumns: '1fr 1fr' },
      1: { gridTemplateColumns: '1fr' },
    },
  },
  defaultVariants: { cols: 1 },
})

const ErrorBanner = styled('div', {
  padding: '$3',
  borderRadius: '$md',
  backgroundColor: '$danger50',
  color: '$danger700',
  fontSize: '$sm',
  marginBottom: '$4',
})

// ------- VALORES INICIAIS -------
const EMPTY_FABRIC = {
  code: '', description: '', color: '', supplier: '', unit: 'metro', minimum_stock: '',
  composition: '', width_cm: '', weight_kg_per_meter: '', grammage: '', yield_pieces_per_meter: '',
}
const EMPTY_ENTRY  = { quantity: '', unitCost: '', referenceDoc: '', notes: '' }
const EMPTY_EXIT   = { quantity: '', notes: '' }

const UNIT_OPTIONS = [
  { value: 'metro', label: 'Metro' },
  { value: 'kg',    label: 'Quilograma (kg)' },
  { value: 'peca',  label: 'Peça' },
]

// ------- COMPONENTE -------
export default function InventoryList() {
  const { fetchFabrics, createFabric, updateFabric, deactivateFabric, registerEntry, registerExit, loading } = useInventory()
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id
  const toast = useToast()

  const [fabrics,  setFabrics]  = useState([])
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [formError, setFormError] = useState('')

  // Tecidos desativados
  const [inactiveFabrics,  setInactiveFabrics]  = useState([])
  const [loadingInactive,  setLoadingInactive]  = useState(false)
  const [showInactive,     setShowInactive]     = useState(false)

  // Modais
  const [modalFabric, setModalFabric] = useState(false)
  const [modalEntry,  setModalEntry]  = useState(false)
  const [modalExit,   setModalExit]   = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [detailFabric, setDetailFabric] = useState(null) // modal de detalhes

  // Formulários
  const [fabricForm,  setFabricForm]  = useState(EMPTY_FABRIC)
  const [entryForm,   setEntryForm]   = useState(EMPTY_ENTRY)
  const [exitForm,    setExitForm]    = useState(EMPTY_EXIT)
  const [editingId,   setEditingId]   = useState(null)
  const [targetFabric, setTargetFabric] = useState(null)

  useEffect(() => { loadFabrics() }, [])

  async function loadFabrics() {
    const data = await fetchFabrics()
    setFabrics(data)
  }

  async function loadInactiveFabrics() {
    if (!tenantId) return
    setLoadingInactive(true)
    const { data } = await supabase
      .from('fabrics')
      .select('id, code, description, color, supplier, unit, current_stock, average_cost')
      .eq('tenant_id', tenantId)
      .eq('is_active', false)
      .order('code')
    setInactiveFabrics(data ?? [])
    setLoadingInactive(false)
  }

  async function handleReactivate(fabric) {
    try {
      await updateFabric(fabric.id, { is_active: true })
      toast?.success(`Tecido "${fabric.description}" reativado.`)
      setInactiveFabrics(prev => prev.filter(f => f.id !== fabric.id))
      await loadFabrics()
    } catch (err) {
      toast?.error(err.message || 'Erro ao reativar tecido.')
    }
  }

  function toggleInactive() {
    if (!showInactive) loadInactiveFabrics()
    setShowInactive(v => !v)
  }

  // ------- ABRIR MODAIS -------
  function openCreateFabric() {
    setEditingId(null)
    setFabricForm(EMPTY_FABRIC)
    setFormError('')
    setModalFabric(true)
  }

  function openEditFabric(fabric) {
    setEditingId(fabric.id)
    setFabricForm({
      code:                    fabric.code,
      description:             fabric.description,
      color:                   fabric.color ?? '',
      supplier:                fabric.supplier ?? '',
      unit:                    fabric.unit,
      minimum_stock:           fabric.minimum_stock,
      composition:             fabric.composition ?? '',
      width_cm:                fabric.width_cm ?? '',
      weight_kg_per_meter:     fabric.weight_kg_per_meter ?? '',
      grammage:                fabric.grammage ?? '',
      yield_pieces_per_meter:  fabric.yield_pieces_per_meter ?? '',
    })
    setFormError('')
    setModalFabric(true)
  }

  function openEntry(fabric) {
    setTargetFabric(fabric)
    setEntryForm(EMPTY_ENTRY)
    setFormError('')
    setModalEntry(true)
  }

  function openExit(fabric) {
    setTargetFabric(fabric)
    setExitForm(EMPTY_EXIT)
    setFormError('')
    setModalExit(true)
  }

  // ------- SALVAR -------
  async function handleSaveFabric() {
    if (!fabricForm.code.trim() || !fabricForm.description.trim()) {
      setFormError('Código e descrição são obrigatórios.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        ...fabricForm,
        minimum_stock: Number(fabricForm.minimum_stock) || 0,
      }
      if (editingId) {
        await updateFabric(editingId, payload)
        toast?.success('Tecido atualizado com sucesso.')
      } else {
        await createFabric(payload)
        toast?.success('Tecido cadastrado com sucesso.')
      }
      setModalFabric(false)
      await loadFabrics()
    } catch (err) {
      if (err.message?.includes('uq_fabric_code_tenant') || err.code === '23505') {
        setFormError(`Já existe um tecido com o código "${fabricForm.code}". Use um código diferente.`)
      } else {
        setFormError(err.message || 'Erro ao salvar tecido.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEntry() {
    if (!entryForm.quantity || !entryForm.unitCost) {
      setFormError('Quantidade e custo unitário são obrigatórios.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await registerEntry({
        fabricId:     targetFabric.id,
        quantity:     Number(entryForm.quantity),
        unitCost:     Number(entryForm.unitCost),
        referenceDoc: entryForm.referenceDoc || undefined,
        notes:        entryForm.notes || undefined,
      })
      toast?.success(`Entrada de ${entryForm.quantity} ${targetFabric.unit} registrada.`)
      setModalEntry(false)
      await loadFabrics()
    } catch (err) {
      setFormError(err.message || 'Erro ao registrar entrada.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveExit() {
    if (!exitForm.quantity) {
      setFormError('Quantidade é obrigatória.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await registerExit({
        fabricId: targetFabric.id,
        quantity: Number(exitForm.quantity),
        notes:    exitForm.notes || undefined,
      })
      toast?.success(`Saída de ${exitForm.quantity} ${targetFabric.unit} registrada.`)
      setModalExit(false)
      await loadFabrics()
    } catch (err) {
      setFormError(err.message || 'Erro ao registrar saída.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(fabric) {
    try {
      await deactivateFabric(fabric.id)
      toast?.success(`Tecido "${fabric.description}" desativado.`)
      await loadFabrics()
    } catch (err) {
      toast?.error(err.message || 'Erro ao desativar tecido.')
    }
  }

  // ------- FILTRO + PAGINAÇÃO -------
  const filtered = fabrics.filter(f => {
    const term = search.toLowerCase()
    return (
      f.code.toLowerCase().includes(term) ||
      f.description.toLowerCase().includes(term) ||
      (f.color?.toLowerCase() ?? '').includes(term) ||
      (f.supplier?.toLowerCase() ?? '').includes(term)
    )
  })

  const pagination = usePagination(filtered, 25)

  function getStockStatus(fabric) {
    const avail = fabric.available_stock ?? fabric.current_stock
    const pct = fabric.minimum_stock > 0 ? avail / fabric.minimum_stock : 2
    if (pct <= 0) return { color: '#ef4444', label: 'Esgotado' }
    if (pct <= 1) return { color: '#f59e0b', label: 'Baixo' }
    return           { color: '#22c55e', label: 'OK' }
  }

  // ------- RENDER -------
  return (
    <div>
      <PageHeader>
        <PageTitle>Tecidos — Estoque</PageTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={loadFabrics} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button size="sm" onClick={openCreateFabric}>
            <Plus size={14} /> Novo Tecido
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
          </Toolbar>
        </CardHeader>

        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <SkeletonTable rows={7} cols={8} />
          ) : filtered.length === 0 ? (
            <EmptyState>
              <Package size={36} style={{ opacity: 0.3 }} />
              <p>{search ? 'Nenhum tecido encontrado.' : 'Nenhum tecido cadastrado. Clique em "Novo Tecido" para começar.'}</p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Cor</th>
                  <th>Fornecedor</th>
                  <th>Estoque</th>
                  <th>Reservado</th>
                  <th>Disponível</th>
                  <th>Mínimo</th>
                  <th>Preço Médio</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginated.map(fabric => {
                  const status = getStockStatus(fabric)
                  const avail  = fabric.available_stock ?? fabric.current_stock
                  const pct    = fabric.minimum_stock > 0
                    ? Math.min((avail / fabric.minimum_stock) * 100, 100)
                    : 100

                  return (
                    <ClickableRow key={fabric.id} onClick={() => setDetailFabric(fabric)}>
                      <td><strong>{fabric.code}</strong></td>
                      <td>{fabric.description}</td>
                      <td>{fabric.color ?? '—'}</td>
                      <td>{fabric.supplier ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
                          <span style={{ fontWeight: 600 }}>
                            {Number(fabric.current_stock).toFixed(2)} {fabric.unit}
                          </span>
                          <StockBar>
                            <div className="fill" style={{ width: `${pct}%`, backgroundColor: status.color }} />
                          </StockBar>
                        </div>
                      </td>
                      <MonoCell style={{ color: fabric.reserved_stock > 0 ? '#d97706' : undefined }}>
                        {Number(fabric.reserved_stock ?? 0).toFixed(2)} {fabric.unit}
                      </MonoCell>
                      <MonoCell style={{ color: avail <= 0 ? '#ef4444' : undefined, fontWeight: 600 }}>
                        {Number(avail).toFixed(2)} {fabric.unit}
                      </MonoCell>
                      <MonoCell>{Number(fabric.minimum_stock).toFixed(2)} {fabric.unit}</MonoCell>
                      <MonoCell>
                        R$ {Number(fabric.average_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </MonoCell>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge color={
                            status.label === 'OK'      ? 'success' :
                            status.label === 'Baixo'   ? 'warning' : 'danger'
                          }>
                            {status.label === 'Baixo' && <AlertTriangle size={11} />}
                            {status.label}
                          </Badge>
                          <ChevronRight size={13} style={{ color: '#d1d5db', flexShrink: 0 }} />
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Button variant="ghost" size="xs" onClick={() => openEditFabric(fabric)}>
                            <Pencil size={12} /> Editar
                          </Button>
                          <Button variant="secondary" size="xs" onClick={() => openEntry(fabric)}>
                            <ArrowDownCircle size={12} /> Entrada
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => openExit(fabric)}>
                            <ArrowUpCircle size={12} /> Saída
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => setConfirmDeactivate(fabric)}>
                            <Trash2 size={12} /> Desativar
                          </Button>
                        </div>
                      </td>
                    </ClickableRow>
                  )
                })}
              </tbody>
            </Table>
          )}
          {!loading && filtered.length > 0 && (
            <Pagination
              page={pagination.page}
              pageSize={25}
              total={pagination.total}
              onPageChange={pagination.setPage}
            />
          )}

          {/* Tecidos desativados */}
          <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--colors-border)' }}>
            <button
              onClick={toggleInactive}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--colors-textSecondary)', fontSize: '0.8125rem',
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
              }}
            >
              <ChevronRight
                size={14}
                style={{ transform: showInactive ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
              />
              Tecidos desativados
              {showInactive && inactiveFabrics.length > 0 && (
                <span style={{ background: '#e5e7eb', borderRadius: 999, padding: '1px 7px', fontSize: '0.75rem' }}>
                  {inactiveFabrics.length}
                </span>
              )}
            </button>

            {showInactive && (
              <div style={{ marginTop: 8 }}>
                {loadingInactive ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--colors-textSecondary)', padding: '8px 0' }}>
                    Carregando...
                  </p>
                ) : inactiveFabrics.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--colors-textSecondary)', padding: '8px 0' }}>
                    Nenhum tecido desativado.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr>
                        {['Código','Descrição','Cor','Fornecedor','Estoque','Preço Médio',''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--colors-textSecondary)', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--colors-border)', backgroundColor: 'var(--colors-gray50)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inactiveFabrics.map(f => (
                        <tr key={f.id} style={{ opacity: 0.7 }}>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--colors-border)', color: 'var(--colors-textPrimary)' }}><strong>{f.code}</strong></td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--colors-border)', color: 'var(--colors-textSecondary)' }}>{f.description}</td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--colors-border)', color: 'var(--colors-textSecondary)' }}>{f.color ?? '—'}</td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--colors-border)', color: 'var(--colors-textSecondary)' }}>{f.supplier ?? '—'}</td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--colors-border)', color: 'var(--colors-textSecondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {Number(f.current_stock).toFixed(2)} {f.unit}
                          </td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--colors-border)', color: 'var(--colors-textSecondary)', fontVariantNumeric: 'tabular-nums' }}>
                            R$ {Number(f.average_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--colors-border)' }}>
                            <Button variant="ghost" size="xs" onClick={() => handleReactivate(f)}>
                              <RotateCcw size={12} /> Reativar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ======== MODAL DETALHES DO TECIDO ======== */}
      {detailFabric && (() => {
        const f      = detailFabric
        const avail  = f.available_stock ?? f.current_stock
        const status = getStockStatus(f)
        const pct    = f.minimum_stock > 0 ? Math.min((avail / f.minimum_stock) * 100, 100) : 100
        const totalValue = Number(f.current_stock) * Number(f.average_cost)

        return (
          <Modal
            open={!!detailFabric}
            onClose={() => setDetailFabric(null)}
            title={`${f.code} — ${f.description}`}
            size="lg"
          >
            {/* Resumo de estoque em destaque */}
            <StockSummary>
              <StockFigure>
                <div className="val">{Number(f.current_stock).toFixed(2)}</div>
                <div className="lbl">Estoque total ({f.unit})</div>
              </StockFigure>
              <StockFigure>
                <div className="val" style={{ color: f.reserved_stock > 0 ? '#d97706' : undefined }}>
                  {Number(f.reserved_stock ?? 0).toFixed(2)}
                </div>
                <div className="lbl">Reservado ({f.unit})</div>
              </StockFigure>
              <StockFigure>
                <div className="val" style={{ color: avail <= 0 ? '#ef4444' : '#15803d' }}>
                  {Number(avail).toFixed(2)}
                </div>
                <div className="lbl">Disponível ({f.unit})</div>
              </StockFigure>
              <StockFigure>
                <div className="val">{Number(f.minimum_stock).toFixed(2)}</div>
                <div className="lbl">Mínimo ({f.unit})</div>
              </StockFigure>
              <StockFigure>
                <div className="val">
                  R$ {Number(f.average_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="lbl">Preço médio / {f.unit}</div>
              </StockFigure>
              <StockFigure>
                <div className="val">
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="lbl">Valor em estoque</div>
              </StockFigure>
            </StockSummary>

            {/* Barra de estoque */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nível de estoque</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: status.color }}>
                  {status.label} — {pct.toFixed(0)}% do mínimo
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: status.color, borderRadius: 999, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Dados cadastrais */}
            <DetailSection>
              <DetailSectionTitle>Dados Cadastrais</DetailSectionTitle>
              <DetailGrid cols="2">
                <DetailField>
                  <DetailLabel>Código</DetailLabel>
                  <DetailValue>{f.code}</DetailValue>
                </DetailField>
                <DetailField>
                  <DetailLabel>Unidade</DetailLabel>
                  <DetailValue style={{ textTransform: 'capitalize' }}>{f.unit}</DetailValue>
                </DetailField>
                <DetailField>
                  <DetailLabel>Cor</DetailLabel>
                  <DetailValue>{f.color || '—'}</DetailValue>
                </DetailField>
                <DetailField>
                  <DetailLabel>Fornecedor</DetailLabel>
                  <DetailValue>{f.supplier || '—'}</DetailValue>
                </DetailField>
                {f.notes && (
                  <DetailField css={{ gridColumn: '1 / -1' }}>
                    <DetailLabel>Observações</DetailLabel>
                    <DetailValue style={{ fontWeight: 400 }}>{f.notes}</DetailValue>
                  </DetailField>
                )}
              </DetailGrid>
            </DetailSection>

            {/* Dados técnicos */}
            {(f.composition || f.width_cm || f.grammage || f.weight_kg_per_meter || f.yield_pieces_per_meter) && (
              <DetailSection>
                <DetailSectionTitle>Dados Técnicos de Corte</DetailSectionTitle>
                <DetailGrid cols="2">
                  {f.composition && (
                    <DetailField css={{ gridColumn: '1 / -1' }}>
                      <DetailLabel>Composição</DetailLabel>
                      <DetailValue style={{ fontWeight: 400 }}>{f.composition}</DetailValue>
                    </DetailField>
                  )}
                  {f.width_cm && (
                    <DetailField>
                      <DetailLabel>Largura</DetailLabel>
                      <DetailValue>{Number(f.width_cm).toFixed(1)} cm</DetailValue>
                    </DetailField>
                  )}
                  {f.grammage && (
                    <DetailField>
                      <DetailLabel>Gramatura</DetailLabel>
                      <DetailValue>{Number(f.grammage).toFixed(1)} g/m²</DetailValue>
                    </DetailField>
                  )}
                  {f.weight_kg_per_meter && (
                    <DetailField>
                      <DetailLabel>Peso por metro</DetailLabel>
                      <DetailValue>{Number(f.weight_kg_per_meter).toFixed(4)} kg/m</DetailValue>
                    </DetailField>
                  )}
                  {f.yield_pieces_per_meter && (
                    <DetailField>
                      <DetailLabel>Rendimento</DetailLabel>
                      <DetailValue>{Number(f.yield_pieces_per_meter).toFixed(4)} peças/m</DetailValue>
                    </DetailField>
                  )}
                </DetailGrid>
              </DetailSection>
            )}

            <ModalFooter>
              <Button variant="ghost" onClick={() => setDetailFabric(null)}>Fechar</Button>
              <Button variant="ghost" size="sm" onClick={() => { setDetailFabric(null); openExit(f) }}>
                <ArrowUpCircle size={14} /> Saída
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setDetailFabric(null); openEntry(f) }}>
                <ArrowDownCircle size={14} /> Entrada
              </Button>
              <Button size="sm" onClick={() => { setDetailFabric(null); openEditFabric(f) }}>
                <Pencil size={14} /> Editar
              </Button>
            </ModalFooter>
          </Modal>
        )
      })()}

      {/* Confirmação de desativação */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={() => handleDeactivate(confirmDeactivate)}
        title="Desativar tecido"
        message={`Desativar "${confirmDeactivate?.description}"? O tecido ficará oculto mas o histórico de movimentações será preservado.`}
        confirmLabel="Desativar"
        danger
      />

      {/* ======== MODAL NOVO / EDITAR TECIDO ======== */}
      <Modal
        open={modalFabric}
        onClose={() => setModalFabric(false)}
        title={editingId ? 'Editar Tecido' : 'Novo Tecido'}
        size="md"
      >
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <FormGrid cols="2">
          <Input
            id="code"
            label="Código *"
            placeholder="Ex: TEC-001"
            value={fabricForm.code}
            onChange={e => setFabricForm(f => ({ ...f, code: e.target.value }))}
          />
          <Select
            id="unit"
            label="Unidade *"
            value={fabricForm.unit}
            onChange={e => setFabricForm(f => ({ ...f, unit: e.target.value }))}
            options={UNIT_OPTIONS}
          />
        </FormGrid>
        <div style={{ marginTop: 16 }}>
          <Input
            id="description"
            label="Descrição *"
            placeholder="Ex: Malha PV Liso"
            value={fabricForm.description}
            onChange={e => setFabricForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <FormGrid cols="2" css={{ marginTop: '$4' }}>
          <Input
            id="color"
            label="Cor"
            placeholder="Ex: Azul Marinho"
            value={fabricForm.color}
            onChange={e => setFabricForm(f => ({ ...f, color: e.target.value }))}
          />
          <Input
            id="supplier"
            label="Fornecedor"
            placeholder="Ex: Textil SA"
            value={fabricForm.supplier}
            onChange={e => setFabricForm(f => ({ ...f, supplier: e.target.value }))}
          />
        </FormGrid>
        <div style={{ marginTop: 16 }}>
          <Input
            id="minimum_stock"
            label="Estoque Mínimo"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={fabricForm.minimum_stock}
            onChange={e => setFabricForm(f => ({ ...f, minimum_stock: e.target.value }))}
          />
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--colors-border)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--colors-textSecondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Dados Técnicos de Corte
          </p>
          <div style={{ marginBottom: 12 }}>
            <Input
              id="composition"
              label="Composição"
              placeholder="Ex: 95% poliéster, 5% elastano"
              value={fabricForm.composition}
              onChange={e => setFabricForm(f => ({ ...f, composition: e.target.value }))}
            />
          </div>
          <FormGrid cols="2">
            <Input
              id="width_cm"
              label="Largura (cm)"
              type="number" min="0" step="0.1"
              placeholder="Ex: 160"
              value={fabricForm.width_cm}
              onChange={e => setFabricForm(f => ({ ...f, width_cm: e.target.value }))}
            />
            <Input
              id="grammage"
              label="Gramatura (g/m²)"
              type="number" min="0" step="0.1"
              placeholder="Ex: 280"
              value={fabricForm.grammage}
              onChange={e => setFabricForm(f => ({ ...f, grammage: e.target.value }))}
            />
            <Input
              id="weight_kg_per_meter"
              label="Peso (kg/metro)"
              type="number" min="0" step="0.0001"
              placeholder="Ex: 0.4500"
              value={fabricForm.weight_kg_per_meter}
              onChange={e => setFabricForm(f => ({ ...f, weight_kg_per_meter: e.target.value }))}
            />
            <Input
              id="yield_pieces_per_meter"
              label="Rendimento (peças/metro)"
              type="number" min="0" step="0.0001"
              placeholder="Ex: 2.5"
              value={fabricForm.yield_pieces_per_meter}
              onChange={e => setFabricForm(f => ({ ...f, yield_pieces_per_meter: e.target.value }))}
            />
          </FormGrid>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalFabric(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSaveFabric} disabled={saving}>
            {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Tecido'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ======== MODAL ENTRADA ======== */}
      <Modal
        open={modalEntry}
        onClose={() => setModalEntry(false)}
        title={`Entrada — ${targetFabric?.description ?? ''}`}
        size="sm"
      >
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <FormGrid cols="2">
          <Input
            id="entry_qty"
            label="Quantidade *"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            value={entryForm.quantity}
            onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))}
          />
          <Input
            id="entry_cost"
            label="Custo Unitário (R$) *"
            type="number"
            min="0.01"
            step="0.0001"
            placeholder="0,0000"
            value={entryForm.unitCost}
            onChange={e => setEntryForm(f => ({ ...f, unitCost: e.target.value }))}
          />
        </FormGrid>
        <div style={{ marginTop: 16 }}>
          <Input
            id="entry_ref"
            label="Nota Fiscal / Referência"
            placeholder="Ex: NF-12345"
            value={entryForm.referenceDoc}
            onChange={e => setEntryForm(f => ({ ...f, referenceDoc: e.target.value }))}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <Input
            id="entry_notes"
            label="Observações"
            placeholder="Opcional"
            value={entryForm.notes}
            onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalEntry(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEntry} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar Entrada'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ======== MODAL SAÍDA ======== */}
      <Modal
        open={modalExit}
        onClose={() => setModalExit(false)}
        title={`Saída — ${targetFabric?.description ?? ''}`}
        size="sm"
      >
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 16 }}>
          Estoque total: <strong>{Number(targetFabric?.current_stock ?? 0).toFixed(2)} {targetFabric?.unit}</strong>
          {targetFabric?.reserved_stock > 0 && (
            <> &nbsp;·&nbsp; Reservado: <strong style={{ color: '#d97706' }}>{Number(targetFabric.reserved_stock).toFixed(2)}</strong>
            &nbsp;·&nbsp; Disponível: <strong style={{ color: '#16a34a' }}>{Number(targetFabric.available_stock ?? 0).toFixed(2)}</strong></>
          )}
        </p>
        <Input
          id="exit_qty"
          label="Quantidade *"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0,00"
          value={exitForm.quantity}
          onChange={e => setExitForm(f => ({ ...f, quantity: e.target.value }))}
        />
        <div style={{ marginTop: 16 }}>
          <Input
            id="exit_notes"
            label="Observações"
            placeholder="Motivo da saída"
            value={exitForm.notes}
            onChange={e => setExitForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalExit(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSaveExit} disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar Saída'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
