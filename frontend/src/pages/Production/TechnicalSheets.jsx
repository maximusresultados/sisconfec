/**
 * TechnicalSheets — Cadastro e gestão de fichas técnicas de produtos
 */
import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, FileText, Trash2, RefreshCw } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { useTechnicalSheets } from '@/hooks/useTechnicalSheets'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'

// ------- CONSTANTES -------
const PRODUCT_TYPES = [
  { value: 'calca',    label: 'Calça' },
  { value: 'blusa',   label: 'Blusa' },
  { value: 'vestido', label: 'Vestido' },
  { value: 'shorts',  label: 'Shorts' },
  { value: 'saia',    label: 'Saia' },
  { value: 'outro',   label: 'Outro' },
]

const ITEM_TYPES = [
  { value: 'tecido',   label: 'Tecido' },
  { value: 'linha',    label: 'Linha' },
  { value: 'botao',    label: 'Botão' },
  { value: 'ziper',    label: 'Zíper' },
  { value: 'elastico', label: 'Elástico' },
  { value: 'outro',    label: 'Outro' },
]

const ITEM_UNITS = [
  { value: 'metro',    label: 'Metro' },
  { value: 'cm',       label: 'Centímetro' },
  { value: 'unidade',  label: 'Unidade' },
  { value: 'g',        label: 'Grama (g)' },
  { value: 'kg',       label: 'Quilograma (kg)' },
]

const ITEM_TYPE_LABELS = { tecido: 'Tecido', linha: 'Linha', botao: 'Botão', ziper: 'Zíper', elastico: 'Elástico', outro: 'Outro' }

const EMPTY_SHEET = { product_code: '', product_name: '', product_type: '', description: '' }
const EMPTY_ITEM  = { item_type: 'linha', description: '', color: '', quantity_per_piece: '', unit: 'unidade', notes: '' }

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$6',
})
const PageTitle = styled('h2', { fontSize: '$2xl', fontWeight: '$bold', color: '$textPrimary' })
const Toolbar = styled('div', { display: 'flex', gap: '$3', alignItems: 'center', marginBottom: '$4', flexWrap: 'wrap' })
const SearchWrapper = styled('div', {
  position: 'relative', width: '240px',
  '& svg': { position: 'absolute', left: '$3', top: '50%', transform: 'translateY(-50%)', color: '$textDisabled', width: '16px', height: '16px', pointerEvents: 'none' },
})
const SearchInput = styled('input', {
  width: '100%', paddingLeft: '$8', paddingRight: '$3', py: '$2', fontSize: '$sm',
  border: '1px solid $border', borderRadius: '$md', outline: 'none', backgroundColor: '$surface', color: '$textPrimary',
  '&:focus': { borderColor: '$primary500', boxShadow: '0 0 0 3px $colors$primary100' },
})
const Table = styled('table', {
  width: '100%', borderCollapse: 'collapse', fontSize: '$sm',
  th: { textAlign: 'left', py: '$3', px: '$4', color: '$textSecondary', fontWeight: '$medium', borderBottom: '1px solid $border', fontSize: '$xs', textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '$gray50' },
  td: { py: '$3', px: '$4', borderBottom: '1px solid $border', color: '$textPrimary', verticalAlign: 'middle' },
  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})
const EmptyState = styled('div', { textAlign: 'center', py: '$12', color: '$textSecondary', '& p': { marginTop: '$2', fontSize: '$sm' } })
const ErrorBanner = styled('div', { padding: '$3 $4', backgroundColor: '$danger50', borderRadius: '$md', color: '$danger700', fontSize: '$sm', marginBottom: '$4' })
const FormGrid = styled('div', {
  display: 'grid', gap: '$4',
  variants: { cols: { 2: { gridTemplateColumns: '1fr 1fr' }, 1: { gridTemplateColumns: '1fr' } } },
  defaultVariants: { cols: 1 },
})
const SectionTitle = styled('p', {
  fontSize: '$xs', fontWeight: '$semibold', color: '$textSecondary',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '$3', marginTop: '$5',
})
const ItemTable = styled('table', {
  width: '100%', borderCollapse: 'collapse', fontSize: '$sm', marginTop: '$2',
  th: { textAlign: 'left', py: '$2', px: '$3', color: '$textSecondary', fontWeight: '$medium', borderBottom: '1px solid $border', fontSize: '$xs', textTransform: 'uppercase', backgroundColor: '$gray50' },
  td: { py: '$2', px: '$3', borderBottom: '1px solid $border', color: '$textPrimary', verticalAlign: 'middle' },
  'tr:last-child td': { borderBottom: 'none' },
})
const ItemFormGrid = styled('div', {
  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '$3', marginTop: '$4',
  padding: '$3', backgroundColor: '$gray50', borderRadius: '$md', border: '1px solid $border',
})

// ------- COMPONENTE -------
export default function TechnicalSheets() {
  const { isAdmin, isEncarregadoCorte } = useAuth()
  const { loading, error, fetchSheets, fetchSheetById, createSheet, updateSheet, deactivateSheet, addItem, updateItem, removeItem } = useTechnicalSheets()

  const [sheets,     setSheets]     = useState([])
  const [search,     setSearch]     = useState('')
  const [saving,     setSaving]     = useState(false)

  // Modal Ficha
  const [showSheet,  setShowSheet]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [sheetForm,  setSheetForm]  = useState(EMPTY_SHEET)
  const [sheetError, setSheetError] = useState('')

  // Modal Insumos
  const [showItems,  setShowItems]  = useState(false)
  const [activeSheet, setActiveSheet] = useState(null)
  const [itemForm,   setItemForm]   = useState(EMPTY_ITEM)
  const [editingItem, setEditingItem] = useState(null)
  const [itemError,  setItemError]  = useState('')
  const [savingItem, setSavingItem] = useState(false)

  const canManage = isAdmin?.() || isEncarregadoCorte?.()

  useEffect(() => { load() }, [])

  async function load() {
    const data = await fetchSheets()
    setSheets(data)
  }

  const filtered = sheets.filter(s =>
    s.product_name.toLowerCase().includes(search.toLowerCase()) ||
    s.product_code.toLowerCase().includes(search.toLowerCase())
  )

  // ------- MODAL FICHA -------
  function openNew() {
    setEditing(null)
    setSheetForm(EMPTY_SHEET)
    setSheetError('')
    setShowSheet(true)
  }

  function openEdit(sheet) {
    setEditing(sheet)
    setSheetForm({ product_code: sheet.product_code, product_name: sheet.product_name, product_type: sheet.product_type ?? '', description: sheet.description ?? '' })
    setSheetError('')
    setShowSheet(true)
  }

  async function handleSaveSheet() {
    if (!sheetForm.product_code.trim() || !sheetForm.product_name.trim()) {
      setSheetError('Código e nome do produto são obrigatórios.')
      return
    }
    setSaving(true)
    setSheetError('')
    try {
      if (editing) {
        await updateSheet(editing.id, sheetForm)
      } else {
        await createSheet(sheetForm)
      }
      setShowSheet(false)
      load()
    } catch (err) {
      if (err.message?.includes('uq_technical_sheet_code_tenant') || err.code === '23505') {
        setSheetError(`Já existe uma ficha com o código "${sheetForm.product_code}".`)
      } else {
        setSheetError(err.message || 'Erro ao salvar.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(sheet) {
    if (!window.confirm(`Desativar a ficha técnica "${sheet.product_name}"?`)) return
    try {
      await deactivateSheet(sheet.id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  // ------- MODAL INSUMOS -------
  async function openItems(sheet) {
    try {
      const full = await fetchSheetById(sheet.id)
      setActiveSheet(full)
      setItemForm(EMPTY_ITEM)
      setEditingItem(null)
      setItemError('')
      setShowItems(true)
    } catch (err) {
      alert(err.message)
    }
  }

  function startEditItem(item) {
    setEditingItem(item)
    setItemForm({
      item_type:          item.item_type ?? 'outro',
      description:        item.description,
      color:              item.color ?? '',
      quantity_per_piece: item.quantity_per_piece ?? '',
      unit:               item.unit ?? 'unidade',
      notes:              item.notes ?? '',
    })
    setItemError('')
  }

  function cancelEditItem() {
    setEditingItem(null)
    setItemForm(EMPTY_ITEM)
    setItemError('')
  }

  async function handleSaveItem() {
    if (!itemForm.description.trim()) {
      setItemError('A descrição do insumo é obrigatória.')
      return
    }
    setSavingItem(true)
    setItemError('')
    try {
      const payload = {
        ...itemForm,
        quantity_per_piece: itemForm.quantity_per_piece !== '' ? Number(itemForm.quantity_per_piece) : null,
      }
      if (editingItem) {
        await updateItem(editingItem.id, payload)
      } else {
        await addItem(activeSheet.id, payload)
      }
      const updated = await fetchSheetById(activeSheet.id)
      setActiveSheet(updated)
      setItemForm(EMPTY_ITEM)
      setEditingItem(null)
      // atualiza contagem na lista
      setSheets(prev => prev.map(s => s.id === updated.id ? { ...s, items_count: updated.items?.length ?? 0 } : s))
    } catch (err) {
      setItemError(err.message || 'Erro ao salvar insumo.')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleRemoveItem(item) {
    if (!window.confirm(`Remover "${item.description}"?`)) return
    try {
      await removeItem(item.id)
      const updated = await fetchSheetById(activeSheet.id)
      setActiveSheet(updated)
      setSheets(prev => prev.map(s => s.id === updated.id ? { ...s, items_count: updated.items?.length ?? 0 } : s))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <PageHeader>
        <PageTitle>Fichas Técnicas</PageTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          {canManage && (
            <Button size="sm" onClick={openNew}>
              <Plus size={14} /> Nova Ficha
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
          </Toolbar>
        </CardHeader>

        <CardBody css={{ px: 0, pb: 0 }}>
          {error && <div style={{ padding: 16, color: '#ef4444', fontSize: '0.875rem' }}>Erro: {error}</div>}

          {loading ? (
            <EmptyState><p>Carregando fichas técnicas...</p></EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>
              <p>{search ? 'Nenhuma ficha encontrada.' : 'Nenhuma ficha técnica cadastrada.'}</p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Insumos</th>
                  {canManage && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(sheet => (
                  <tr key={sheet.id}>
                    <td><strong>{sheet.product_code}</strong></td>
                    <td>{sheet.product_name}</td>
                    <td>
                      {sheet.product_type
                        ? <Badge color="default">{PRODUCT_TYPES.find(t => t.value === sheet.product_type)?.label ?? sheet.product_type}</Badge>
                        : '—'}
                    </td>
                    <td>
                      <Badge color={sheet.items_count > 0 ? 'primary' : 'default'}>
                        {sheet.items_count} insumo{sheet.items_count !== 1 ? 's' : ''}
                      </Badge>
                    </td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button variant="ghost" size="xs" onClick={() => openItems(sheet)}>
                            <FileText size={12} /> Insumos
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => openEdit(sheet)}>
                            <Edit2 size={12} /> Editar
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => handleDeactivate(sheet)}>
                            <Trash2 size={12} /> Desativar
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

      {/* ======== MODAL CRIAR/EDITAR FICHA ======== */}
      <Modal
        open={showSheet}
        onClose={() => setShowSheet(false)}
        title={editing ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
        size="md"
      >
        {sheetError && <ErrorBanner>{sheetError}</ErrorBanner>}
        <FormGrid cols="2">
          <Input
            label="Código *"
            id="product_code"
            value={sheetForm.product_code}
            onChange={e => setSheetForm(f => ({ ...f, product_code: e.target.value }))}
            placeholder="Ex: CAL-LEG-001"
          />
          <Select
            label="Tipo de Produto"
            id="product_type"
            value={sheetForm.product_type}
            onChange={e => setSheetForm(f => ({ ...f, product_type: e.target.value }))}
            options={PRODUCT_TYPES}
            placeholder="Selecione..."
          />
        </FormGrid>
        <div style={{ marginTop: 16 }}>
          <Input
            label="Nome do Produto *"
            id="product_name"
            value={sheetForm.product_name}
            onChange={e => setSheetForm(f => ({ ...f, product_name: e.target.value }))}
            placeholder="Ex: Calça Legging Basic"
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <Input
            label="Descrição"
            id="description"
            value={sheetForm.description}
            onChange={e => setSheetForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Observações gerais sobre o produto..."
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowSheet(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSaveSheet} disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Ficha'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ======== MODAL INSUMOS ======== */}
      <Modal
        open={showItems}
        onClose={() => { setShowItems(false); setEditingItem(null) }}
        title={`Insumos — ${activeSheet?.product_name ?? ''}`}
        size="lg"
      >
        {/* Lista de insumos */}
        {activeSheet?.items?.length > 0 ? (
          <ItemTable>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Cor</th>
                <th>Qtd/Peça</th>
                <th>Un.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeSheet.items.map(item => (
                <tr key={item.id}>
                  <td><Badge color="default">{ITEM_TYPE_LABELS[item.item_type] ?? item.item_type ?? '—'}</Badge></td>
                  <td>{item.description}</td>
                  <td>{item.color || '—'}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {item.quantity_per_piece != null ? Number(item.quantity_per_piece).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td>{item.unit ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="xs" onClick={() => startEditItem(item)}>
                        <Edit2 size={11} /> Editar
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => handleRemoveItem(item)}>
                        <Trash2 size={11} /> Remover
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </ItemTable>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--colors-textSecondary)', fontSize: '0.875rem' }}>
            Nenhum insumo cadastrado ainda.
          </div>
        )}

        {/* Formulário add/edit insumo */}
        <SectionTitle>{editingItem ? 'Editar Insumo' : 'Adicionar Insumo'}</SectionTitle>
        {itemError && <ErrorBanner>{itemError}</ErrorBanner>}
        <ItemFormGrid>
          <Select
            label="Tipo"
            id="item_type"
            value={itemForm.item_type}
            onChange={e => setItemForm(f => ({ ...f, item_type: e.target.value }))}
            options={ITEM_TYPES}
          />
          <Input
            label="Descrição *"
            id="item_desc"
            value={itemForm.description}
            onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ex: Linha 120 branca"
          />
          <Input
            label="Cor"
            id="item_color"
            value={itemForm.color}
            onChange={e => setItemForm(f => ({ ...f, color: e.target.value }))}
            placeholder="Ex: Branco"
          />
          <Input
            label="Qtd por Peça"
            id="item_qty"
            type="number" min="0" step="0.0001"
            value={itemForm.quantity_per_piece}
            onChange={e => setItemForm(f => ({ ...f, quantity_per_piece: e.target.value }))}
            placeholder="Ex: 1.5"
          />
          <Select
            label="Unidade"
            id="item_unit"
            value={itemForm.unit}
            onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
            options={ITEM_UNITS}
          />
          <Input
            label="Observações"
            id="item_notes"
            value={itemForm.notes}
            onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notas..."
          />
        </ItemFormGrid>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          {editingItem && (
            <Button variant="secondary" size="sm" onClick={cancelEditItem} disabled={savingItem}>
              Cancelar
            </Button>
          )}
          <Button size="sm" onClick={handleSaveItem} disabled={savingItem}>
            {savingItem ? 'Salvando...' : editingItem ? 'Salvar Insumo' : 'Adicionar Insumo'}
          </Button>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowItems(false); setEditingItem(null) }}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
