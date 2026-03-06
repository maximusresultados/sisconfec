/**
 * ForgotPassword — Solicitar link de recuperação de senha
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
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

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch {
      setError('Erro ao enviar e-mail. Verifique o endereço e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Page>
        <LoginCard padding="lg">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src="/logo-sard.png" alt="Sard" style={{ height: '72px', width: 'auto' }} />
          </div>
          <Title>E-mail enviado!</Title>
          <Subtitle>
            Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            O link expira em 1 hora.
          </Subtitle>
          <BackLink><Link to="/login">Voltar ao login</Link></BackLink>
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
        <Title>Recuperar senha</Title>
        <Subtitle>Informe seu e-mail para receber o link de redefinição.</Subtitle>

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

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>

        <BackLink><Link to="/login">Voltar ao login</Link></BackLink>
      </LoginCard>
    </Page>
  )
}
