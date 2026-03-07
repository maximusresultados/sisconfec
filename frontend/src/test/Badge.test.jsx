import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, STATUS_COLOR_MAP, STATUS_LABEL_MAP } from '@/components/common/Badge'

describe('Badge', () => {
  it('renderiza o texto corretamente', () => {
    render(<Badge>Ativo</Badge>)
    expect(screen.getByText('Ativo')).toBeInTheDocument()
  })

  it('renderiza como elemento span', () => {
    render(<Badge>Teste</Badge>)
    const el = screen.getByText('Teste')
    expect(el.tagName.toLowerCase()).toBe('span')
  })

  it('aceita conteúdo dinâmico', () => {
    render(<Badge color="success">Aprovado</Badge>)
    expect(screen.getByText('Aprovado')).toBeInTheDocument()
  })

  it('renderiza com color danger sem erros', () => {
    render(<Badge color="danger">Cancelado</Badge>)
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })
})

describe('STATUS_COLOR_MAP', () => {
  it('contém mapeamentos para os principais status', () => {
    expect(STATUS_COLOR_MAP.pendente).toBe('default')
    expect(STATUS_COLOR_MAP.aprovado).toBe('success')
    expect(STATUS_COLOR_MAP.cancelado).toBe('danger')
    expect(STATUS_COLOR_MAP.em_revisao).toBe('warning')
  })
})

describe('STATUS_LABEL_MAP', () => {
  it('traduz os status para português', () => {
    expect(STATUS_LABEL_MAP.pendente).toBe('Pendente')
    expect(STATUS_LABEL_MAP.aprovado).toBe('Aprovado')
    expect(STATUS_LABEL_MAP.cancelado).toBe('Cancelado')
    expect(STATUS_LABEL_MAP.em_corte).toBe('Em Corte')
  })
})
