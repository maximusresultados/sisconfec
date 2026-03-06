/**
 * Reports — Kardex (com filtro de data), Estoque Mínimo e Resumo de Facção
 * Inclui exportação CSV e loading skeletons.
 */
import { useEffect, useState } from 'react'
import { Printer, Filter, Download, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useInventory } from '@/hooks/useInventory'
import { useExport } from '@/hooks/useExport'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Select } from '@/components/common/Select'
import { Input } from '@/components/common/Input'
import { SkeletonTable } from '@/components/common/Skeleton'
import { Pagination, usePagination } from '@/components/common/Pagination'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '$6',
  flexWrap: 'wrap',
  gap: '$3',
})

const PageTitle = styled('h2', { fontSize: '$2xl', fontWeight: '$bold', color: '$textPrimary' })

const TabBar = styled('div', {
  display: 'flex',
  gap: 0,
  borderBottom: '2px solid $border',
  marginBottom: '$6',
})

const Tab = styled('button', {
  px: '$5', py: '$3',
  fontSize: '$sm', fontWeight: '$medium',
  border: 'none', backgroundColor: 'transparent',
  cursor: 'pointer', color: '$textSecondary',
  borderBottom: '2px solid transparent', marginBottom: '-2px',
  transition: 'color $fast, border-color $fast',
  '&:hover': { color: '$textPrimary' },
  variants: {
    active: { true: { color: '$primary600', borderBottomColor: '$primary600' } },
  },
})

const Toolbar = styled('div', {
  display: 'flex', gap: '$3', alignItems: 'flex-end',
  marginBottom: '$4', flexWrap: 'wrap',
})

const Table = styled('table', {
  width: '100%', borderCollapse: 'collapse', fontSize: '$sm',
  th: {
    textAlign: 'left', py: '$3', px: '$4', color: '$textSecondary',
    fontWeight: '$medium', borderBottom: '1px solid $border', fontSize: '$xs',
    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    backgroundColor: '$gray50',
  },
  td: { py: '$3', px: '$4', borderBottom: '1px solid $border', color: '$textPrimary', verticalAlign: 'middle' },
  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})

const MonoCell = styled('td', { fontVariantNumeric: 'tabular-nums', fontSize: '$sm' })

const EmptyState = styled('div', {
  textAlign: 'center', py: '$12', color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const KpiGrid = styled('div', {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '$4', marginBottom: '$6',
  '@media (max-width: 768px)': { gridTemplateColumns: 'repeat(2, 1fr)' },
})

const KpiCard = styled('div', {
  backgroundColor: '$surface', border: '1px solid $border',
  borderRadius: '$xl', padding: '$4', boxShadow: '$sm',
})

const KpiLabel = styled('p', {
  fontSize: '$xs', fontWeight: '$medium', color: '$textSecondary',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '$1',
})

const KpiValue = styled('p', { fontSize: '$xl', fontWeight: '$bold', color: '$textPrimary' })

const TypeBadgeMap  = { entrada: 'success', saida: 'danger' }
const TypeLabelMap  = { entrada: 'Entrada', saida: 'Saída'  }

const PAGE_SIZE = 50

// ------- COMPONENTE -------
export default function Reports() {
  const { profile } = useAuth()
  const tenantId    = profile?.tenant_id
  const { fetchFabrics, fetchKardex } = useInventory()
  const { exportCSV } = useExport()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('kardex')

  // --- Kardex ---
  const [fabrics,        setFabrics]        = useState([])
  const [selectedFabric, setSelectedFabric] = useState('')
  const [kardex,         setKardex]         = useState([])
  const [loadingKardex,  setLoadingKardex]  = useState(false)
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')

  // Paginação local do kardex
  const kardexPagination = usePagination(kardex, PAGE_SIZE)

  // --- Estoque Mínimo ---
  const [lowStock,        setLowStock]        = useState([])
  const [loadingLowStock, setLoadingLowStock] = useState(false)
  const lowStockPagination = usePagination(lowStock, PAGE_SIZE)

  // --- Resumo Facção ---
  const [factionSummary, setFactionSummary] = useState([])
  const [loadingFaction, setLoadingFaction] = useState(false)

  useEffect(() => {
    fetchFabrics().then(setFabrics)
  }, [])

  useEffect(() => {
    if (activeTab === 'estoque_minimo' && lowStock.length === 0) loadLowStock()
    if (activeTab === 'faccao'         && factionSummary.length === 0) loadFactionSummary()
  }, [activeTab])

  async function handleFetchKardex() {
    if (!selectedFabric) return
    setLoadingKardex(true)
    try {
      const data = await fetchKardex(selectedFabric, {
        limit:   500,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
      })
      setKardex(data)
      if (data.length === 0) toast?.info('Nenhuma movimentação encontrada para os filtros aplicados.')
    } catch (err) {
      toast?.error(err.message || 'Erro ao buscar Kardex.')
    } finally {
      setLoadingKardex(false)
    }
  }

  async function loadLowStock() {
    setLoadingLowStock(true)
    try {
      const { data } = await supabase
        .from('vw_low_stock_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('deficit', { ascending: false })
      setLowStock(data ?? [])
    } finally {
      setLoadingLowStock(false)
    }
  }

  async function loadFactionSummary() {
    setLoadingFaction(true)
    try {
      const { data } = await supabase
        .from('vw_faction_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('seamstress_name')
      setFactionSummary(data ?? [])
    } finally {
      setLoadingFaction(false)
    }
  }

  // --- Exportações CSV ---
  function exportKardex() {
    exportCSV(`kardex-${selectedFabric}.csv`, [
      { key: 'created_at',         label: 'Data',           format: v => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
      { key: 'type',               label: 'Tipo',           format: v => TypeLabelMap[v] ?? v },
      { key: 'quantity',           label: 'Quantidade',     format: v => Number(v).toFixed(3) },
      { key: 'unit_cost',          label: 'Custo Unit.',    format: v => Number(v || 0).toFixed(4) },
      { key: 'total_cost',         label: 'Total (R$)',     format: v => Number(v || 0).toFixed(2) },
      { key: 'stock_before',       label: 'Estoque Antes',  format: v => Number(v || 0).toFixed(3) },
      { key: 'stock_after',        label: 'Estoque Depois', format: v => Number(v || 0).toFixed(3) },
      { key: 'average_cost_after', label: 'PM Depois',      format: v => Number(v || 0).toFixed(4) },
      { key: 'reference_doc',      label: 'Referência'     },
      { key: 'created_by_name',    label: 'Usuário'        },
    ], kardex)
    toast?.success('Kardex exportado com sucesso.')
  }

  function exportLowStock() {
    exportCSV('estoque-minimo.csv', [
      { key: 'code',          label: 'Código'       },
      { key: 'description',   label: 'Descrição'    },
      { key: 'color',         label: 'Cor'          },
      { key: 'supplier',      label: 'Fornecedor'   },
      { key: 'current_stock', label: 'Estoque Atual', format: v => Number(v).toFixed(2) },
      { key: 'minimum_stock', label: 'Estoque Mín.', format: v => Number(v).toFixed(2) },
      { key: 'deficit',       label: 'Déficit',      format: v => Number(v || 0).toFixed(2) },
      { key: 'average_cost',  label: 'Custo Médio',  format: v => Number(v || 0).toFixed(4) },
      { key: 'value_at_risk', label: 'Valor em Risco', format: v => Number(v || 0).toFixed(2) },
    ], lowStock)
    toast?.success('Relatório de estoque mínimo exportado.')
  }

  function exportFaction() {
    exportCSV('resumo-faccao.csv', [
      { key: 'seamstress_name',        label: 'Costureira'       },
      { key: 'total_dispatches',       label: 'Total Remessas'   },
      { key: 'total_pieces_sent',      label: 'Peças Enviadas',  format: v => Number(v || 0) },
      { key: 'total_pieces_returned',  label: 'Peças Retornadas', format: v => Number(v || 0) },
      { key: 'total_pending_payment',  label: 'A Pagar (R$)',    format: v => Number(v || 0).toFixed(2) },
    ], factionSummary)
    toast?.success('Resumo de facção exportado.')
  }

  // --- Helpers PDF ---
  function buildPDFTable(doc, { title, subtitle, headers, rows }) {
    const margin = 10
    const pageW  = doc.internal.pageSize.getWidth()
    const pageH  = doc.internal.pageSize.getHeight()
    const tableW = pageW - margin * 2
    const colW   = tableW / headers.length
    const rowH   = 7
    let y = 10

    doc.setFontSize(13)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text(title, margin, y + 4)
    y += 10

    if (subtitle) {
      doc.setFontSize(8)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(107, 114, 128)
      doc.text(subtitle, margin, y + 3)
      y += 8
    }

    // cabeçalho
    doc.setFillColor(59, 130, 246)
    doc.rect(margin, y, tableW, rowH, 'F')
    doc.setFontSize(6.5)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255)
    headers.forEach((h, i) => doc.text(String(h).toUpperCase(), margin + i * colW + 2, y + rowH - 2))
    y += rowH

    // linhas
    doc.setFont(undefined, 'normal')
    doc.setFontSize(7)
    rows.forEach((row, ri) => {
      if (y + rowH > pageH - margin) {
        doc.addPage()
        y = margin
      }
      if (ri % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y, tableW, rowH, 'F')
      }
      doc.setTextColor(31, 41, 55)
      row.forEach((cell, ci) => {
        doc.text(String(cell ?? '—'), margin + ci * colW + 2, y + rowH - 2)
      })
      y += rowH
    })
  }

  function exportKardexPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const fabricLabel = fabrics.find(f => f.id === selectedFabric)?.description ?? ''
    buildPDFTable(doc, {
      title: `Kardex — ${fabricLabel}`,
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      headers: ['Data', 'Tipo', 'Qtd', 'Custo Unit.', 'Total R$', 'Estq. Antes', 'Estq. Depois', 'PM Depois', 'Referência', 'Usuário'],
      rows: kardex.map(row => [
        row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '—',
        TypeLabelMap[row.type] ?? row.type,
        Number(row.quantity).toFixed(2),
        `R$${Number(row.unit_cost ?? 0).toFixed(2)}`,
        `R$${Number(row.total_cost ?? 0).toFixed(2)}`,
        Number(row.stock_before ?? 0).toFixed(2),
        Number(row.stock_after ?? 0).toFixed(2),
        `R$${Number(row.average_cost_after ?? 0).toFixed(2)}`,
        row.reference_doc ?? '—',
        row.created_by_name ?? '—',
      ]),
    })
    doc.save(`kardex-${fabricLabel}.pdf`)
    toast?.success('PDF do Kardex gerado.')
  }

  function exportLowStockPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    buildPDFTable(doc, {
      title: 'Relatório de Estoque Mínimo',
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      headers: ['Código', 'Descrição', 'Cor', 'Fornecedor', 'Estoque Atual', 'Estoque Mín.', 'Déficit', 'Custo Médio', 'Valor em Risco'],
      rows: lowStock.map(row => [
        row.code,
        row.description,
        row.color ?? '—',
        row.supplier ?? '—',
        Number(row.current_stock).toFixed(2),
        Number(row.minimum_stock).toFixed(2),
        Number(row.deficit ?? 0).toFixed(2),
        `R$${Number(row.average_cost ?? 0).toFixed(2)}`,
        `R$${Number(row.value_at_risk ?? 0).toFixed(2)}`,
      ]),
    })
    doc.save('estoque-minimo.pdf')
    toast?.success('PDF de estoque mínimo gerado.')
  }

  function exportFactionPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    buildPDFTable(doc, {
      title: 'Resumo de Facção',
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      headers: ['Costureira', 'Remessas', 'Pç. Enviadas', 'Pç. Retornadas', '% Retorno', 'A Pagar (R$)'],
      rows: factionSummary.map(row => {
        const sent     = Number(row.total_pieces_sent) || 0
        const returned = Number(row.total_pieces_returned) || 0
        const pct      = sent > 0 ? ((returned / sent) * 100).toFixed(1) + '%' : '—'
        return [
          row.seamstress_name ?? row.name ?? '—',
          row.total_dispatches ?? 0,
          sent.toLocaleString('pt-BR'),
          returned.toLocaleString('pt-BR'),
          pct,
          row.total_pending_payment != null
            ? `R$${Number(row.total_pending_payment).toFixed(2)}`
            : '—',
        ]
      }),
    })
    doc.save('resumo-faccao.pdf')
    toast?.success('PDF de facção gerado.')
  }

  const fabricOptions = fabrics.map(f => ({
    value: f.id,
    label: `${f.code} — ${f.description}${f.color ? ` (${f.color})` : ''}`,
  }))

  const kpiTotalSent     = factionSummary.reduce((a, s) => a + (Number(s.total_pieces_sent)     || 0), 0)
  const kpiTotalReturned = factionSummary.reduce((a, s) => a + (Number(s.total_pieces_returned) || 0), 0)
  const kpiBalance       = kpiTotalSent - kpiTotalReturned
  const kpiPending       = factionSummary.reduce((a, s) => a + (Number(s.total_pending_payment) || 0), 0)

  return (
    <div>
      <PageHeader>
        <PageTitle>Relatórios</PageTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'kardex' && kardex.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={exportKardex}>
                <Download size={14} /> CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={exportKardexPDF}>
                <FileText size={14} /> PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} className="no-print">
                <Printer size={14} /> Imprimir
              </Button>
            </>
          )}
          {activeTab === 'estoque_minimo' && lowStock.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={exportLowStock}>
                <Download size={14} /> CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={exportLowStockPDF}>
                <FileText size={14} /> PDF
              </Button>
            </>
          )}
          {activeTab === 'faccao' && factionSummary.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={exportFaction}>
                <Download size={14} /> CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={exportFactionPDF}>
                <FileText size={14} /> PDF
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <TabBar>
        <Tab active={activeTab === 'kardex'}         onClick={() => setActiveTab('kardex')}>Kardex</Tab>
        <Tab active={activeTab === 'estoque_minimo'} onClick={() => setActiveTab('estoque_minimo')}>Estoque Mínimo</Tab>
        <Tab active={activeTab === 'faccao'}         onClick={() => setActiveTab('faccao')}>Resumo de Facção</Tab>
      </TabBar>

      {/* ======== ABA KARDEX ======== */}
      {activeTab === 'kardex' && (
        <div>
          <Toolbar>
            <div style={{ flex: 2, minWidth: '260px' }}>
              <Select
                label="Tecido"
                id="fabric_select"
                value={selectedFabric}
                onChange={e => setSelectedFabric(e.target.value)}
                options={fabricOptions}
                placeholder="Selecione um tecido..."
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <Input
                id="date_from"
                label="Data inicial"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <Input
                id="date_to"
                label="Data final"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            <Button onClick={handleFetchKardex} disabled={!selectedFabric || loadingKardex} style={{ alignSelf: 'flex-end' }}>
              <Filter size={14} />
              {loadingKardex ? 'Buscando...' : 'Filtrar'}
            </Button>
          </Toolbar>

          {loadingKardex ? (
            <Card padding="none"><CardBody css={{ px: 0, pb: 0 }}><SkeletonTable rows={8} cols={8} /></CardBody></Card>
          ) : kardex.length === 0 ? (
            <EmptyState>
              <p>{selectedFabric ? 'Nenhuma movimentação para os filtros aplicados.' : 'Selecione um tecido para visualizar o Kardex.'}</p>
            </EmptyState>
          ) : (
            <Card padding="none">
              <CardBody css={{ px: 0, pb: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Qtd</th>
                      <th>Custo Unit.</th>
                      <th>Total</th>
                      <th>Estoque Antes</th>
                      <th>Estoque Depois</th>
                      <th>PM Antes</th>
                      <th>PM Depois</th>
                      <th>Referência</th>
                      <th>Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexPagination.paginated.map((row, i) => (
                      <tr key={row.id ?? i}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td>
                          <Badge color={TypeBadgeMap[row.type] ?? 'default'}>
                            {TypeLabelMap[row.type] ?? row.type}
                          </Badge>
                        </td>
                        <MonoCell>{Number(row.quantity).toFixed(2)}</MonoCell>
                        <MonoCell>R$ {Number(row.unit_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</MonoCell>
                        <MonoCell>R$ {Number(row.total_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</MonoCell>
                        <MonoCell>{Number(row.stock_before ?? 0).toFixed(2)}</MonoCell>
                        <MonoCell>{Number(row.stock_after ?? 0).toFixed(2)}</MonoCell>
                        <MonoCell>R$ {Number(row.average_cost_before ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</MonoCell>
                        <MonoCell>R$ {Number(row.average_cost_after ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</MonoCell>
                        <td>{row.reference_doc ?? '—'}</td>
                        <td>{row.created_by_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="no-print">
                  <Pagination
                    page={kardexPagination.page}
                    pageSize={PAGE_SIZE}
                    total={kardexPagination.total}
                    onPageChange={kardexPagination.setPage}
                  />
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ======== ABA ESTOQUE MÍNIMO ======== */}
      {activeTab === 'estoque_minimo' && (
        <div>
          {loadingLowStock ? (
            <Card padding="none"><CardBody css={{ px: 0, pb: 0 }}><SkeletonTable rows={6} cols={7} /></CardBody></Card>
          ) : lowStock.length === 0 ? (
            <EmptyState><p>Nenhum tecido abaixo do estoque mínimo.</p></EmptyState>
          ) : (
            <Card padding="none">
              <CardBody css={{ px: 0, pb: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Código</th><th>Descrição</th><th>Cor</th><th>Fornecedor</th>
                      <th>Estoque Atual</th><th>Estoque Mínimo</th><th>Déficit</th>
                      <th>Custo Médio</th><th>Valor em Risco</th><th>Urgência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockPagination.paginated.map((row, i) => {
                      const deficit    = Number(row.deficit ?? 0)
                      const minStock   = Number(row.minimum_stock ?? 0)
                      const deficitPct = minStock > 0 ? (deficit / minStock) * 100 : 0
                      const urgency    = deficitPct > 50 ? 'danger' : 'warning'
                      return (
                        <tr key={row.id ?? i}>
                          <td><strong>{row.code}</strong></td>
                          <td>{row.description}</td>
                          <td>{row.color ?? '—'}</td>
                          <td>{row.supplier ?? '—'}</td>
                          <MonoCell>{Number(row.current_stock).toFixed(2)}</MonoCell>
                          <MonoCell>{Number(row.minimum_stock).toFixed(2)}</MonoCell>
                          <MonoCell style={{ color: '#b91c1c', fontWeight: 600 }}>{deficit.toFixed(2)}</MonoCell>
                          <MonoCell>R$ {Number(row.average_cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</MonoCell>
                          <MonoCell>R$ {Number(row.value_at_risk ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</MonoCell>
                          <td><Badge color={urgency}>{deficitPct > 50 ? 'Crítico' : 'Baixo'}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
                <Pagination
                  page={lowStockPagination.page}
                  pageSize={PAGE_SIZE}
                  total={lowStockPagination.total}
                  onPageChange={lowStockPagination.setPage}
                />
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ======== ABA RESUMO DE FACÇÃO ======== */}
      {activeTab === 'faccao' && (
        <div>
          <KpiGrid>
            <KpiCard><KpiLabel>Total Enviado</KpiLabel><KpiValue>{kpiTotalSent.toLocaleString('pt-BR')} pç</KpiValue></KpiCard>
            <KpiCard><KpiLabel>Total Retornado</KpiLabel><KpiValue>{kpiTotalReturned.toLocaleString('pt-BR')} pç</KpiValue></KpiCard>
            <KpiCard>
              <KpiLabel>Saldo em Campo</KpiLabel>
              <KpiValue style={{ color: kpiBalance > 0 ? '#b45309' : '#15803d' }}>
                {kpiBalance.toLocaleString('pt-BR')} pç
              </KpiValue>
            </KpiCard>
            <KpiCard>
              <KpiLabel>Valor Pendente</KpiLabel>
              <KpiValue>R$ {kpiPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</KpiValue>
            </KpiCard>
          </KpiGrid>

          {loadingFaction ? (
            <Card padding="none"><CardBody css={{ px: 0, pb: 0 }}><SkeletonTable rows={5} cols={6} /></CardBody></Card>
          ) : factionSummary.length === 0 ? (
            <EmptyState><p>Nenhuma costureira com remessas registradas.</p></EmptyState>
          ) : (
            <Card padding="none">
              <CardBody css={{ px: 0, pb: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Costureira</th><th>Total Remessas</th>
                      <th>Peças Enviadas</th><th>Peças Retornadas</th>
                      <th>% Retorno</th><th>A Pagar (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factionSummary.map((row, i) => {
                      const sent     = Number(row.total_pieces_sent) || 0
                      const returned = Number(row.total_pieces_returned) || 0
                      const pct      = sent > 0 ? ((returned / sent) * 100).toFixed(1) : '—'
                      return (
                        <tr key={row.seamstress_id ?? i}>
                          <td><strong>{row.seamstress_name ?? row.name ?? '—'}</strong></td>
                          <td>{row.total_dispatches ?? 0}</td>
                          <MonoCell>{sent.toLocaleString('pt-BR')}</MonoCell>
                          <MonoCell>{returned.toLocaleString('pt-BR')}</MonoCell>
                          <td>
                            {pct !== '—'
                              ? <Badge color={Number(pct) >= 90 ? 'success' : Number(pct) >= 70 ? 'warning' : 'danger'}>{pct}%</Badge>
                              : '—'
                            }
                          </td>
                          <MonoCell>
                            {row.total_pending_payment != null
                              ? `R$ ${Number(row.total_pending_payment).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </MonoCell>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
