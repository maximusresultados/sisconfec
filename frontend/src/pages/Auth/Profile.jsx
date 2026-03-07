/**
 * Profile — Tela de perfil do usuário autenticado
 * Permite alterar nome e senha.
 */
import { useState } from 'react'
import { User, Lock, CheckCircle } from 'lucide-react'
import { styled } from '@/styles/stitches.config'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { translateError } from '@/lib/errorMessages'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

const PageHeader = styled('div', {
  mb: '$6',
})

const PageTitle = styled('h2', {
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: '$textPrimary',
})

const PageSubtitle = styled('p', {
  fontSize: '$sm',
  color: '$textSecondary',
  mt: '$1',
})

const Grid = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '$6',
  '@media (max-width: 768px)': { gridTemplateColumns: '1fr' },
})

const AvatarCircle = styled('div', {
  size: '72px',
  borderRadius: '$full',
  backgroundColor: '$primary600',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: 'white',
  mb: '$4',
})

const InfoRow = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$1',
  mb: '$4',
})

const InfoLabel = styled('span', {
  fontSize: '$xs',
  fontWeight: '$semibold',
  color: '$textSecondary',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
})

const InfoValue = styled('span', {
  fontSize: '$sm',
  color: '$textPrimary',
})

const ROLE_LABEL = {
  admin:             'Administrador',
  estoquista:        'Estoquista',
  encarregado_corte: 'Encarregado de Corte',
  gestor_faccao:     'Gestor de Facção',
}

export default function Profile() {
  const { profile, updateProfile } = useAuth()
  const toast = useToast()

  // Form: nome
  const [fullName,      setFullName]      = useState(profile?.full_name ?? '')
  const [savingName,    setSavingName]    = useState(false)

  // Form: senha
  const [newPass,       setNewPass]       = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [savingPass,    setSavingPass]    = useState(false)
  const [passError,     setPassError]     = useState('')

  async function handleSaveName(e) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSavingName(true)
    try {
      await updateProfile({ full_name: fullName.trim() })
      toast?.success('Nome atualizado com sucesso.')
    } catch (err) {
      toast?.error(translateError(err))
    } finally {
      setSavingName(false)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    setPassError('')

    if (newPass.length < 6) {
      setPassError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPass !== confirmPass) {
      setPassError('As senhas não coincidem.')
      return
    }

    setSavingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) throw error

      toast?.success('Senha alterada com sucesso.')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      toast?.error(translateError(err))
    } finally {
      setSavingPass(false)
    }
  }

  const initials = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div>
      <PageHeader>
        <PageTitle>Meu Perfil</PageTitle>
        <PageSubtitle>Gerencie suas informações e segurança da conta.</PageSubtitle>
      </PageHeader>

      <Grid>
        {/* Informações da conta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Card: dados atuais */}
          <Card>
            <CardHeader>
              <CardTitle>
                <User size={16} style={{ marginRight: 6 }} />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardBody>
              <AvatarCircle>{initials}</AvatarCircle>
              <InfoRow>
                <InfoLabel>E-mail</InfoLabel>
                <InfoValue>{profile?.email ?? '—'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Função</InfoLabel>
                <InfoValue>{ROLE_LABEL[profile?.role] ?? profile?.role ?? '—'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Status</InfoLabel>
                <InfoValue style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} style={{ color: '#16a34a' }} />
                  {profile?.is_active ? 'Ativo' : 'Inativo'}
                </InfoValue>
              </InfoRow>
            </CardBody>
          </Card>

          {/* Card: alterar nome */}
          <Card>
            <CardHeader>
              <CardTitle>Alterar Nome</CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  id="full_name"
                  label="Nome completo"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
                <Button type="submit" disabled={savingName || !fullName.trim()}>
                  {savingName ? 'Salvando...' : 'Salvar nome'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Card: alterar senha */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Lock size={16} style={{ marginRight: 6 }} />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                id="new_pass"
                label="Nova senha"
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="••••••••"
                hint="Mínimo de 6 caracteres."
                required
                autoComplete="new-password"
              />
              <Input
                id="confirm_pass"
                label="Confirmar nova senha"
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                hasError={!!passError}
                error={passError}
                required
                autoComplete="new-password"
              />
              <Button type="submit" disabled={savingPass || !newPass || !confirmPass}>
                {savingPass ? 'Salvando...' : 'Alterar senha'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </Grid>
    </div>
  )
}
