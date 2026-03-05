/**
 * ErrorBoundary — Captura erros em qualquer sub-árvore React
 * e exibe mensagem amigável ao invés de tela em branco.
 */
import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: this.props.fullScreen ? '100vh' : '50vh',
        gap: 16,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
          {this.props.title ?? 'Algo deu errado'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', maxWidth: 420, lineHeight: 1.6 }}>
          {this.state.error?.message || 'Ocorreu um erro inesperado. Tente recarregar a página.'}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }
}
