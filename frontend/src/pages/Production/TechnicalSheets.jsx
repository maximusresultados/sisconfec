/**
 * TechnicalSheets — Cadastro e gestão de fichas técnicas de produtos
 */
import { useEffect, useState, useRef } from 'react'
import { Plus, Search, Edit2, FileText, Trash2, RefreshCw, ChevronRight, ImagePlus, X } from 'lucide-react'
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
const EMPTY_ITEM  = { item_type: 'linha', description: '', color: '', quantity_per_piece: '', unit: 'unidade', unit_cost: '' }

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

const ClickableRow = styled('tr', {
  cursor: 'pointer',
  '& td': { transition: 'background-color 0.15s' },
  '&:hover td': { backgroundColor: '$primary50 !important' },
})

const DetailSection = styled('div', {
  '& + &': { marginTop: '$4', paddingTop: '$4', borderTop: '1px solid $border' },
})
const DetailSectionTitle = styled('p', {
  fontSize: '$xs', fontWeight: '$semibold', color: '$textSecondary',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '$3',
})
const DetailGrid = styled('div', {
  display: 'grid', gap: '$3', gridTemplateColumns: '1fr 1fr',
})
const DetailField = styled('div', {})
const DetailLabel = styled('p', { fontSize: '$xs', color: '$textSecondary', marginBottom: '2px' })
const DetailValue = styled('p', { fontSize: '$sm', fontWeight: '$medium', color: '$textPrimary' })

// ------- COMPONENTE -------
export default function TechnicalSheets() {
  const { isAdmin, isEncarregadoCorte } = useAuth()
  const { loading, error, fetchSheets, fetchSheetById, createSheet, updateSheet, deactivateSheet, addItem, updateItem, removeItem, uploadImage, removeImage } = useTechnicalSheets()

  const [sheets,     setSheets]     = useState([])
  const [search,     setSearch]     = useState('')
  const [saving,     setSaving]     = useState(false)

  // Modal Ficha
  const [showSheet,  setShowSheet]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [sheetForm,  setSheetForm]  = useState(EMPTY_SHEET)
  const [sheetError, setSheetError] = useState('')

  // Modal Detalhe
  const [detailSheet,    setDetailSheet]    = useState(null)
  const [loadingDetail,  setLoadingDetail]  = useState(false)

  // Upload de imagem
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef(null)

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

  // ------- MODAL DETALHE -------
  async function openDetail(sheet) {
    setDetailSheet({ ...sheet, items: null })
    setLoadingDetail(true)
    try {
      const full = await fetchSheetById(sheet.id)
      setDetailSheet(full)
    } catch { /* mostra sem itens */ }
    finally { setLoadingDetail(false) }
  }

  // ------- MODAL FICHA -------
  function openNew() {
    setEditing(null)
    setSheetForm(EMPTY_SHEET)
    setSheetError('')
    setImageFile(null)
    setImagePreview(null)
    setShowSheet(true)
  }

  function openEdit(sheet) {
    setEditing(sheet)
    setSheetForm({ product_code: sheet.product_code, product_name: sheet.product_name, product_type: sheet.product_type ?? '', description: sheet.description ?? '' })
    setSheetError('')
    setImageFile(null)
    setImagePreview(sheet.image_url ?? null)
    setShowSheet(true)
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSheetError('Selecione um arquivo de imagem (JPG, PNG, WEBP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSheetError('A imagem deve ter no máximo 5 MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setSheetError('')
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSaveSheet() {
    if (!sheetForm.product_code.trim() || !sheetForm.product_name.trim()) {
      setSheetError('Código e nome do produto são obrigatórios.')
      return
    }
    setSaving(true)
    setSheetError('')
    try {
      let sheet
      if (editing) {
        sheet = await updateSheet(editing.id, sheetForm)
      } else {
        sheet = await createSheet(sheetForm)
      }

      // Upload da imagem se selecionada
      if (imageFile && sheet?.id) {
        setUploadingImg(true)
        try {
          await uploadImage(sheet.id, imageFile)
        } catch (imgErr) {
          setSheetError('Ficha salva, mas erro ao enviar imagem: ' + imgErr.message)
          setUploadingImg(false)
          load()
          return
        }
        setUploadingImg(false)
      } else if (!imagePreview && editing?.image_url) {
        // Usuário removeu a imagem existente
        await removeImage(editing.id, editing.image_url)
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
      unit_cost:          item.unit_cost ?? '',
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
        unit_cost:          itemForm.unit_cost !== '' ? Number(itemForm.unit_cost) : null,
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
                  <ClickableRow key={sheet.id} onClick={() => openDetail(sheet)}>
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
                      <td onClick={e => e.stopPropagation()}>
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
                    {!canManage && (
                      <td>
                        <ChevronRight size={13} style={{ color: '#d1d5db' }} />
                      </td>
                    )}
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* ======== MODAL DETALHE FICHA TÉCNICA ======== */}
      {detailSheet && (
        <Modal
          open={!!detailSheet}
          onClose={() => setDetailSheet(null)}
          title={`${detailSheet.product_code} — ${detailSheet.product_name}`}
          size="lg"
        >
          {/* Imagem do produto */}
          {detailSheet.image_url && (
            <DetailSection>
              <img
                src={detailSheet.image_url}
                alt={detailSheet.product_name}
                style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '8px', marginBottom: '4px' }}
              />
            </DetailSection>
          )}

          {/* Informações do produto */}
          <DetailSection>
            <DetailSectionTitle>Dados do Produto</DetailSectionTitle>
            <DetailGrid>
              <DetailField>
                <DetailLabel>Código</DetailLabel>
                <DetailValue>{detailSheet.product_code}</DetailValue>
              </DetailField>
              <DetailField>
                <DetailLabel>Tipo</DetailLabel>
                <DetailValue>
                  {detailSheet.product_type
                    ? PRODUCT_TYPES.find(t => t.value === detailSheet.product_type)?.label ?? detailSheet.product_type
                    : '—'}
                </DetailValue>
              </DetailField>
              {detailSheet.description && (
                <DetailField css={{ gridColumn: '1 / -1' }}>
                  <DetailLabel>Descrição</DetailLabel>
                  <DetailValue style={{ fontWeight: 400 }}>{detailSheet.description}</DetailValue>
                </DetailField>
              )}
            </DetailGrid>
          </DetailSection>

          {/* Lista de insumos */}
          <DetailSection>
            <DetailSectionTitle>
              Insumos {loadingDetail ? '(carregando...)' : `(${detailSheet.items?.length ?? 0})`}
            </DetailSectionTitle>
            {!loadingDetail && detailSheet.items?.length > 0 ? (
              <>
                <ItemTable>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Cor</th>
                      <th>Qtd/Peça</th>
                      <th>Un.</th>
                      <th>Custo do Insumo</th>
                      <th>Custo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSheet.items.map(item => {
                      const qty       = item.quantity_per_piece != null ? Number(item.quantity_per_piece) : null
                      const unitCost  = item.unit_cost != null ? Number(item.unit_cost) : null
                      const totalCost = qty != null && unitCost != null ? qty * unitCost : null
                      return (
                        <tr key={item.id}>
                          <td><Badge color="default">{ITEM_TYPE_LABELS[item.item_type] ?? item.item_type ?? '—'}</Badge></td>
                          <td>{item.description}</td>
                          <td>{item.color || '—'}</td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {qty != null ? qty.toLocaleString('pt-BR') : '—'}
                          </td>
                          <td>{item.unit ?? '—'}</td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {unitCost != null ? unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {totalCost != null ? totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </ItemTable>
                {/* Custo total de todos os insumos */}
                {(() => {
                  const grandTotal = detailSheet.items.reduce((sum, item) => {
                    const qty      = item.quantity_per_piece != null ? Number(item.quantity_per_piece) : null
                    const unitCost = item.unit_cost != null ? Number(item.unit_cost) : null
                    return sum + (qty != null && unitCost != null ? qty * unitCost : 0)
                  }, 0)
                  return grandTotal > 0 ? (
                    <div style={{
                      marginTop: 8, padding: '6px 12px', borderRadius: 6,
                      backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                      fontSize: '0.875rem', color: '#1e40af', textAlign: 'right',
                    }}>
                      <strong>Custo Total dos Insumos:</strong>{' '}
                      {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  ) : null
                })()}
              </>
            ) : !loadingDetail ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--colors-textSecondary)' }}>Nenhum insumo cadastrado.</p>
            ) : null}
          </DetailSection>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setDetailSheet(null)}>Fechar</Button>
            {canManage && (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setDetailSheet(null); openEdit(detailSheet) }}>
                  <Edit2 size={14} /> Editar
                </Button>
                <Button size="sm" onClick={() => { setDetailSheet(null); openItems(detailSheet) }}>
                  <FileText size={14} /> Gerenciar Insumos
                </Button>
              </>
            )}
          </ModalFooter>
        </Modal>
      )}

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

        {/* Upload de imagem */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--colors-textPrimary)', marginBottom: 8 }}>
            Foto do Produto
          </p>
          {imagePreview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--colors-border)' }}
              />
              <button
                type="button"
                onClick={clearImage}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, cursor: 'pointer', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--colors-border)', borderRadius: '8px',
                padding: '24px', textAlign: 'center', cursor: 'pointer',
                color: 'var(--colors-textSecondary)', fontSize: '0.875rem',
                transition: 'border-color 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--colors-border)'}
            >
              <ImagePlus size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
              Clique para selecionar uma imagem
              <br />
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>JPG, PNG ou WEBP — máx. 5 MB</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowSheet(false)} disabled={saving || uploadingImg}>Cancelar</Button>
          <Button onClick={handleSaveSheet} disabled={saving || uploadingImg}>
            {uploadingImg ? 'Enviando imagem...' : saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Ficha'}
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
          <>
            <ItemTable>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Cor</th>
                  <th>Qtd/Peça</th>
                  <th>Un.</th>
                  <th>Custo do Insumo</th>
                  <th>Custo Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeSheet.items.map(item => {
                  const qty       = item.quantity_per_piece != null ? Number(item.quantity_per_piece) : null
                  const unitCost  = item.unit_cost != null ? Number(item.unit_cost) : null
                  const totalCost = qty != null && unitCost != null ? qty * unitCost : null
                  return (
                    <tr key={item.id}>
                      <td><Badge color="default">{ITEM_TYPE_LABELS[item.item_type] ?? item.item_type ?? '—'}</Badge></td>
                      <td>{item.description}</td>
                      <td>{item.color || '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {qty != null ? qty.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td>{item.unit ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {unitCost != null ? unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {totalCost != null ? totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                      </td>
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
                  )
                })}
              </tbody>
            </ItemTable>
            {(() => {
              const grandTotal = activeSheet.items.reduce((sum, item) => {
                const qty      = item.quantity_per_piece != null ? Number(item.quantity_per_piece) : null
                const unitCost = item.unit_cost != null ? Number(item.unit_cost) : null
                return sum + (qty != null && unitCost != null ? qty * unitCost : 0)
              }, 0)
              return grandTotal > 0 ? (
                <div style={{
                  marginTop: 8, padding: '6px 12px', borderRadius: 6,
                  backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                  fontSize: '0.875rem', color: '#1e40af', textAlign: 'right',
                }}>
                  <strong>Custo Total dos Insumos:</strong>{' '}
                  {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              ) : null
            })()}
          </>
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
            label="Custo do Insumo (R$/un.)"
            id="item_unit_cost"
            type="number" min="0" step="0.0001"
            value={itemForm.unit_cost}
            onChange={e => setItemForm(f => ({ ...f, unit_cost: e.target.value }))}
            placeholder="0,0000"
          />
        </ItemFormGrid>
        {itemForm.quantity_per_piece && itemForm.unit_cost && (
          <div style={{
            marginTop: 8, padding: '6px 12px', borderRadius: 6,
            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
            fontSize: '0.875rem', color: '#1e40af',
          }}>
            <strong>Custo Total deste Insumo:</strong>{' '}
            {(Number(itemForm.quantity_per_piece) * Number(itemForm.unit_cost)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        )}
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
