/**
 * Users — Gestão de usuários do tenant (somente admin)
 *
 * Permite visualizar, editar role, ativar/desativar e convidar usuários.
 * Criação de novos usuários usa o endpoint backend /api/users (Auth Admin API).
 */
import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, Shield, Pencil, UserX, UserCheck, Search } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { Card, CardBody } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Modal, ModalFooter } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SkeletonTable } from '@/components/common/Skeleton'

// ------- ESTILOS -------
const PageHeader = styled('div', {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$6',
})
const PageTitle = styled('h2', { fontSize: '$2xl', fontWeight: '$bold', color: '$textPrimary' })

const Toolbar = styled('div', {
  display: 'flex', gap: '$3', alignItems: 'center', marginBottom: '$4', flexWrap: 'wrap',
})

const SearchWrapper = styled('div', {
  position: 'relative', flex: 1, minWidth: '240px',
  '& svg': { position: 'absolute', left: '$3', top: '50%', transform: 'translateY(-50%)', color: '$textDisabled', width: '16px', height: '16px', pointerEvents: 'none' },
})
const SearchInput = styled('input', {
  width: '100%', pl: '$8', pr: '$3', py: '$2', fontSize: '$sm',
  border: '1px solid $border', borderRadius: '$md', outline: 'none',
  backgroundColor: '$surface', color: '$textPrimary',
  '&:focus': { borderColor: '$primary500', boxShadow: '0 0 0 3px $colors$primary100' },
  '&::placeholder': { color: '$textDisabled' },
})

const Table = styled('table', {
  width: '100%', borderCollapse: 'collapse', fontSize: '$sm',
  th: {
    textAlign: 'left', py: '$3', px: '$4', color: '$textSecondary', fontWeight: '$medium',
    borderBottom: '1px solid $border', fontSize: '$xs', textTransform: 'uppercase', letterSpacing: '0.04em',
    backgroundColor: '$gray50',
  },
  td: { py: '$3', px: '$4', borderBottom: '1px solid $border', color: '$textPrimary', verticalAlign: 'middle' },
  'tr:last-child td': { borderBottom: 'none' },
  'tbody tr:hover td': { backgroundColor: '$gray50' },
})

const EmptyState = styled('div', {
  textAlign: 'center', py: '$12', color: '$textSecondary',
  '& p': { marginTop: '$2', fontSize: '$sm' },
})

const ErrorBanner = styled('div', {
  padding: '$3', borderRadius: '$md', backgroundColor: '$danger50', color: '$danger700',
  fontSize: '$sm', marginBottom: '$4',
})

const FormGrid = styled('div', {
  display: 'grid', gap: '$4',
  variants: { cols: { 2: { gridTemplateColumns: '1fr 1fr' }, 1: { gridTemplateColumns: '1fr' } } },
  defaultVariants: { cols: 1 },
})

// ------- OPÇÕES -------
const ROLE_OPTIONS = [
  { value: 'admin',             label: 'Administrador'       },
  { value: 'estoquista',        label: 'Estoquista'          },
  { value: 'encarregado_corte', label: 'Encarregado de Corte'},
  { value: 'gestor_faccao',     label: 'Gestor de Facção'    },
]

const ROLE_LABEL = {
  admin:            'Administrador',
  estoquista:       'Estoquista',
  encarregado_corte:'Encarregado de Corte',
  gestor_faccao:    'Gestor de Facção',
}

const ROLE_COLOR = {
  admin:            'danger',
  estoquista:       'info',
  encarregado_corte:'warning',
  gestor_faccao:    'success',
}

const EMPTY_INVITE = { full_name: '', email: '', role: 'estoquista', password: '' }

// ------- COMPONENTE -------
export default function Users() {
  const { profile } = useAuth()
  const toast = useToast()
  const tenantId = profile?.tenant_id

  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [formError, setFormError] = useState('')

  // Modais
  const [modalInvite, setModalInvite] = useState(false)
  const [modalEdit,   setModalEdit]   = useState(false)

  // Forms
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE)
  const [editingUser, setEditingUser] = useState(null)
  const [editRole, setEditRole] = useState('')

  // Confirmação de ativar/desativar
  const [confirmTarget, setConfirmTarget] = useState(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('full_name')
      if (error) throw error
      setUsers(data ?? [])
    } catch (err) {
      toast?.error('Erro ao carregar usuários: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [tenantId, toast])

  useEffect(() => { loadUsers() }, [loadUsers])

  function openEdit(user) {
    setEditingUser(user)
    setEditRole(user.role)
    setFormError('')
    setModalEdit(true)
  }

  async function handleUpdateRole() {
    if (!editingUser || !editRole) return
    setSaving(true)
    setFormError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: editRole })
        .eq('id', editingUser.id)
        .eq('tenant_id', tenantId)
      if (error) throw error
      toast?.success(`Role de ${editingUser.full_name} atualizado para ${ROLE_LABEL[editRole]}.`)
      setModalEdit(false)
      await loadUsers()
    } catch (err) {
      setFormError(err.message || 'Erro ao atualizar role.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user) {
    try {
      const newState = !user.is_active
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newState })
        .eq('id', user.id)
        .eq('tenant_id', tenantId)
      if (error) throw error
      toast?.success(`Usuário ${user.full_name} ${newState ? 'ativado' : 'desativado'} com sucesso.`)
      await loadUsers()
    } catch (err) {
      toast?.error(err.message || 'Erro ao alterar status.')
    }
  }

  async function handleInvite() {
    const { full_name, email, role, password } = inviteForm
    if (!full_name.trim() || !email.trim() || !password.trim()) {
      setFormError('Nome, e-mail e senha são obrigatórios.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const session = (await supabase.auth.getSession()).data.session
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ full_name, email, role, password }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Erro ao criar usuário.')
      }
      toast?.success(`Usuário ${full_name} criado com sucesso.`)
      setModalInvite(false)
      setInviteForm(EMPTY_INVITE)
      await loadUsers()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u => {
    const term = search.toLowerCase()
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (ROLE_LABEL[u.role] ?? '').toLowerCase().includes(term)
    )
  })

  return (
    <div>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={22} style={{ color: '#2563eb' }} />
          <PageTitle>Usuários do Sistema</PageTitle>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => { setInviteForm(EMPTY_INVITE); setFormError(''); setModalInvite(true) }}>
            <Plus size={14} /> Novo Usuário
          </Button>
        </div>
      </PageHeader>

      <Card padding="none">
        <div style={{ padding: '16px 16px 0' }}>
          <Toolbar>
            <SearchWrapper>
              <Search />
              <SearchInput
                placeholder="Buscar por nome, e-mail ou perfil..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </SearchWrapper>
          </Toolbar>
        </div>

        <CardBody css={{ px: 0, pb: 0 }}>
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState><p>{search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}</p></EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.full_name}</strong></td>
                    <td style={{ color: '#6b7280' }}>{u.email}</td>
                    <td>
                      <Badge color={ROLE_COLOR[u.role] ?? 'default'}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={u.is_active ? 'success' : 'default'}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="ghost" size="xs" onClick={() => openEdit(u)}>
                          <Pencil size={12} /> Editar Role
                        </Button>
                        {u.id !== profile?.id && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setConfirmTarget(u)}
                          >
                            {u.is_active
                              ? <><UserX size={12} /> Desativar</>
                              : <><UserCheck size={12} /> Ativar</>
                            }
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal Novo Usuário */}
      <Modal open={modalInvite} onClose={() => setModalInvite(false)} title="Novo Usuário" size="sm">
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input id="inv_name"  label="Nome completo *" placeholder="Ex: Maria Oliveira"
            value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))} />
          <Input id="inv_email" label="E-mail *" type="email" placeholder="maria@empresa.com"
            value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
          <Input id="inv_pass"  label="Senha inicial *" type="password" placeholder="Mín. 8 caracteres"
            value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))} />
          <Select id="inv_role" label="Perfil de acesso" value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
            options={ROLE_OPTIONS} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalInvite(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleInvite} disabled={saving}>
            {saving ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Editar Role */}
      <Modal open={modalEdit} onClose={() => setModalEdit(false)} title={`Editar perfil — ${editingUser?.full_name}`} size="sm">
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <Select id="edit_role" label="Perfil de acesso" value={editRole}
          onChange={e => setEditRole(e.target.value)}
          options={ROLE_OPTIONS} />
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalEdit(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleUpdateRole} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alteração'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirmação ativar/desativar */}
      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => handleToggleActive(confirmTarget)}
        title={confirmTarget?.is_active ? 'Desativar usuário' : 'Ativar usuário'}
        message={
          confirmTarget?.is_active
            ? `Desativar ${confirmTarget?.full_name}? O usuário perderá o acesso ao sistema.`
            : `Reativar ${confirmTarget?.full_name}? O usuário voltará a ter acesso ao sistema.`
        }
        confirmLabel={confirmTarget?.is_active ? 'Desativar' : 'Ativar'}
        danger={confirmTarget?.is_active}
      />
    </div>
  )
}
