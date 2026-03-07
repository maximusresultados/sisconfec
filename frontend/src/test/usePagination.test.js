import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination } from '@/components/common/Pagination'

const makeItems = (n) => Array.from({ length: n }, (_, i) => i)

describe('usePagination', () => {
  it('retorna página 1 e primeiros N itens por padrão', () => {
    const { result } = renderHook(() => usePagination(makeItems(25), 10))

    expect(result.current.page).toBe(1)
    expect(result.current.paginated).toHaveLength(10)
    expect(result.current.paginated[0]).toBe(0)
    expect(result.current.total).toBe(25)
  })

  it('navega para a próxima página corretamente', () => {
    const { result } = renderHook(() => usePagination(makeItems(25), 10))

    act(() => result.current.setPage(2))

    expect(result.current.page).toBe(2)
    expect(result.current.paginated).toHaveLength(10)
    expect(result.current.paginated[0]).toBe(10)
  })

  it('última página retorna apenas os itens restantes', () => {
    const { result } = renderHook(() => usePagination(makeItems(25), 10))

    act(() => result.current.setPage(3))

    expect(result.current.page).toBe(3)
    expect(result.current.paginated).toHaveLength(5)
    expect(result.current.paginated[0]).toBe(20)
  })

  it('lida corretamente com lista vazia', () => {
    const { result } = renderHook(() => usePagination([], 10))

    expect(result.current.paginated).toHaveLength(0)
    expect(result.current.total).toBe(0)
    expect(result.current.page).toBe(1)
  })

  it('usa pageSize padrão de 20 quando não informado', () => {
    const { result } = renderHook(() => usePagination(makeItems(50)))

    expect(result.current.paginated).toHaveLength(20)
  })

  it('reseta para página 1 quando a lista muda de tamanho', () => {
    let items = makeItems(30)
    const { result, rerender } = renderHook(() => usePagination(items, 10))

    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    items = makeItems(5)
    rerender()

    expect(result.current.page).toBe(1)
  })
})
