/**
 * ResetPassword — Definir nova senha via link do e-mail
 *
 * Supabase envia um link com #access_token=...&type=recovery.
 * O SDK dispara o evento PASSWORD_RECOVERY via onAuthStateChange,
 * após o qual podemos chamar supabase.auth.updateUser({ password }).
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { translateError } from '@/lib/errorMessages'
import { styled } from '@/styles/stitches.config'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

const Page = styled('div', {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$gray900',
  px: '$4',
})

const LoginCard = styled(Card, {
  width: '100%',
  maxWidth: '400px',
})

const Title = styled('h1', {
  fontSize: '$2xl',
  fontWeight: '$bold',
  color: '$primary600',
  textAlign: 'center',
  mb: '$1',
})

const Subtitle = styled('p', {
  fontSize: '$sm',
  color: '$textSecondary',
  textAlign: 'center',
  mb: '$6',
})

const FormGroup = styled('div', {
  mb: '$4',
  '& label': {
    display: 'block',
    fontSize: '$sm',
    fontWeight: '$medium',
    color: '$textPrimary',
    mb: '$1',
  },
})

const Input = styled('input', {
  width: '100%',
  px: '$3',
  py: '$2',
  fontSize: '$sm',
  border: '1px solid $border',
  borderRadius: '$md',
  outline: 'none',
  backgroundColor: '$surface',
  color: '$textPrimary',
  transition: 'border-color $fast, box-shadow $fast',
  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 3px $colors$primary100',
  },
  '&::placeholder': { color: '$textDisabled' },
})

const ErrorMsg = styled('p', {
  fontSize: '$sm',
  color: '$danger500',
  mb: '$4',
  textAlign: 'center',
})

const BackLink = styled('div', {
  textAlign: 'center',
  mt: '$4',
  '& a': {
    fontSize: '$sm',
    color: '$primary600',
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
  },
})

const PasswordHint = styled('p', {
  fontSize: '$xs',
  color: '$textSecondary',
  mt: '$1',
})

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready,    setReady]    = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(translateError(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Page>
        <LoginCard padding="lg">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src="/logo-sard.png" alt="Sard" style={{ height: '72px', width: 'auto' }} />
          </div>
          <Title>Senha redefinida!</Title>
          <Subtitle>Sua senha foi atualizada com sucesso. Redirecionando para o login...</Subtitle>
        </LoginCard>
      </Page>
    )
  }

  if (!ready) {
    return (
      <Page>
        <LoginCard padding="lg">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src="/logo-sard.png" alt="Sard" style={{ height: '72px', width: 'auto' }} />
          </div>
          <Title>Redefinir senha</Title>
          <Subtitle>Validando o link de recuperação...</Subtitle>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center' }}>
            Se a página não carregar,{' '}
            <Link to="/esqueci-senha" style={{ color: '#3b82f6' }}>solicite um novo link</Link>.
          </p>
        </LoginCard>
      </Page>
    )
  }

  return (
    <Page>
      <LoginCard padding="lg">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img src="/logo-sard.png" alt="Sard" style={{ height: '72px', width: 'auto' }} />
        </div>
        <Title>Nova senha</Title>
        <Subtitle>Escolha uma nova senha para sua conta.</Subtitle>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <label htmlFor="password">Nova senha</label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <PasswordHint>Mínimo de 6 caracteres.</PasswordHint>
          </FormGroup>

          <FormGroup>
            <label htmlFor="confirm">Confirmar senha</label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </FormGroup>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>

        <BackLink><Link to="/login">Voltar ao login</Link></BackLink>
      </LoginCard>
    </Page>
  )
}
