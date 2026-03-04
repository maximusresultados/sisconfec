/**
 * Login — Página de autenticação
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { styled } from '@/styles/stitches.config'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

// ------- ESTILOS -------
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

  '&::placeholder': {
    color: '$textDisabled',
  },
})

const ErrorMsg = styled('p', {
  fontSize: '$sm',
  color: '$danger500',
  mb: '$4',
  textAlign: 'center',
})

// ------- COMPONENTE -------
export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : 'Erro ao fazer login. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page>
      <LoginCard padding="lg">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/logo-sard.png" alt="Sard" style={{ height: '72px', width: 'auto' }} />
        </div>
        <Subtitle>Gestão de Estoque e Produção</Subtitle>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <label htmlFor="email">E-mail</label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </FormGroup>

          <FormGroup>
            <label htmlFor="password">Senha</label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </FormGroup>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </LoginCard>
    </Page>
  )
}
