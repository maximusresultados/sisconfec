/**
 * InventoryList — Lista de tecidos em estoque
 *
 * Demonstra:
 * - Busca de dados via hook useInventory (Supabase)
 * - Componentes estilizados com Stitches (@stitches/react)
 * - Pesquisa, filtros e ação de nova entrada/saída
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, RefreshCw, AlertTriangle, Package } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { useInventory } from '@/hooks/useInventory'
import { Button } from '@/components/common/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  mb: '$6',
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
  mb: '$4',
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
})

const Table = styled('table', {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '$sm',

  'th': {
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

  'td': {
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

  '& p': { mt: '$2', fontSize: '$sm' },
})

const CostCell = styled('td', {
  fontVariantNumeric: 'tabular-nums',
  fontFamily: '$mono',
  fontSize: '$xs',
})

// ------- COMPONENTE -------
export default function InventoryList() {
  const { fetchFabrics, loading, error } = useInventory()

  const [fabrics, setFabrics] = useState([])
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    loadFabrics()
  }, [])

  async function loadFabrics() {
    const data = await fetchFabrics()
    setFabrics(data)
  }

  // Filtra localmente pela busca
  const filtered = fabrics.filter(f => {
    const term = search.toLowerCase()
    return (
      f.code.toLowerCase().includes(term) ||
      f.description.toLowerCase().includes(term) ||
      (f.color?.toLowerCase() ?? '').includes(term) ||
      (f.supplier?.toLowerCase() ?? '').includes(term)
    )
  })

  function getStockStatus(fabric) {
    const pct = fabric.minimum_stock > 0
      ? fabric.current_stock / fabric.minimum_stock
      : 2

    if (pct <= 0)  return { color: '#ef4444', label: 'Esgotado' }
    if (pct <= 1)  return { color: '#f59e0b', label: 'Baixo'    }
    return              { color: '#22c55e', label: 'OK'         }
  }

  return (
    <div>
      <PageHeader>
        <PageTitle>Tecidos — Estoque</PageTitle>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={loadFabrics}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button size="sm" as={Link} to="/estoque/tecidos/novo">
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
                placeholder="Buscar por código, descrição, cor ou fornecedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </SearchWrapper>
          </Toolbar>
        </CardHeader>

        <CardBody css={{ px: 0, pb: 0 }}>
          {error && (
            <div style={{ padding: '16px', color: '#ef4444', fontSize: '0.875rem' }}>
              Erro ao carregar tecidos: {error}
            </div>
          )}

          {loading ? (
            <EmptyState><p>Carregando tecidos...</p></EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState>
              <Package size={36} style={{ opacity: 0.3 }} />
              <p>{search ? 'Nenhum tecido encontrado para a busca.' : 'Nenhum tecido cadastrado.'}</p>
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
                  <th>Mínimo</th>
                  <th>Preço Médio</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(fabric => {
                  const status = getStockStatus(fabric)
                  const pct    = fabric.minimum_stock > 0
                    ? Math.min((fabric.current_stock / fabric.minimum_stock) * 100, 100)
                    : 100

                  return (
                    <tr key={fabric.id}>
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
                      <td>{Number(fabric.minimum_stock).toFixed(2)} {fabric.unit}</td>
                      <CostCell>
                        R$ {Number(fabric.average_cost).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                      </CostCell>
                      <td>
                        <Badge color={
                          status.label === 'OK'      ? 'success' :
                          status.label === 'Baixo'   ? 'warning' : 'danger'
                        }>
                          {status.label === 'Baixo' && <AlertTriangle size={11} />}
                          {status.label}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            variant="ghost"
                            size="xs"
                            as={Link}
                            to={`/estoque/tecidos/${fabric.id}`}
                          >
                            Kardex
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            as={Link}
                            to={`/estoque/tecidos/${fabric.id}/entrada`}
                          >
                            Entrada
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
