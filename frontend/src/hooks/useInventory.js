/**
 * useInventory — Hook de gerenciamento de estoque
 *
 * Encapsula todas as operações de leitura e escrita relacionadas
 * a tecidos e movimentações de estoque.
 */
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Faz o parse seguro da resposta do backend.
 * Evita "Unexpected end of JSON input" quando o servidor retorna
 * corpo vazio, HTML (página de erro do Vercel/Nginx) ou status inesperado.
 */
async function parseApiResponse(res) {
  const text = await res.text().catch(() => '')
  if (!text.trim()) {
    throw new Error(
      `Erro ${res.status} – o servidor não retornou nenhuma resposta. ` +
      `Verifique se o backend está rodando e a variável VITE_API_URL está configurada.`
    )
  }
  try {
    return JSON.parse(text)
  } catch {
    // Servidor retornou HTML (página de erro do proxy/Vercel) ou texto puro
    throw new Error(
      `Erro ${res.status} – resposta inválida do servidor. ` +
      `Detalhe: ${text.slice(0, 120).replace(/<[^>]+>/g, '').trim()}`
    )
  }
}

export function useInventory() {
  const { profile } = useAuth()
  const tenantId    = profile?.tenant_id

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ------- TECIDOS -------

  /** Lista todos os tecidos ativos do tenant (com reserved_stock e available_stock) */
  const fetchFabrics = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('vw_fabric_stock')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('code')

      if (filters.search) {
        query = query.or(`code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      if (filters.supplier) {
        query = query.eq('supplier', filters.supplier)
      }
      if (filters.lowStockOnly) {
        query = query.lte('current_stock', supabase.raw('minimum_stock'))
      }

      const { data, error } = await query
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  /** Busca um tecido por ID */
  const fetchFabricById = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('fabrics')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) throw error
    return data
  }, [tenantId])

  /** Cria um novo tecido */
  const createFabric = useCallback(async (fabricData) => {
    const { data, error } = await supabase
      .from('fabrics')
      .insert({ ...fabricData, tenant_id: tenantId, created_by: profile.id })
      .select()
      .single()

    if (error) throw error
    return data
  }, [tenantId, profile?.id])

  /** Atualiza dados de um tecido (não atualiza estoque diretamente) */
  const updateFabric = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('fabrics')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return data
  }, [tenantId])

  /** Soft delete — desativa o tecido */
  const deactivateFabric = useCallback(async (id) => {
    return updateFabric(id, { is_active: false })
  }, [updateFabric])

  // ------- MOVIMENTAÇÕES (KARDEX) -------

  /**
   * Registra uma entrada de estoque.
   * O recálculo de preço médio é feito pelo backend auxiliar (Node.js).
   * Este hook chama o endpoint /api/inventory/entrada que faz tudo atomicamente.
   */
  const registerEntry = useCallback(async ({ fabricId, quantity, unitCost, referenceDoc, notes }) => {
    setLoading(true)
    setError(null)
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) throw new Error('VITE_API_URL não está configurada. Verifique o arquivo .env do frontend.')

      const response = await fetch(`${apiUrl}/api/inventory/entrada`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ fabricId, quantity, unitCost, referenceDoc, notes }),
      })

      const data = await parseApiResponse(response)
      if (!response.ok) throw new Error(data.message || `Erro ${response.status} ao registrar entrada.`)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Registra uma saída de estoque.
   * O backend valida se há saldo suficiente antes de debitar.
   */
  const registerExit = useCallback(async ({ fabricId, quantity, cuttingOrderId, notes }) => {
    setLoading(true)
    setError(null)
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      if (!apiUrl) throw new Error('VITE_API_URL não está configurada. Verifique o arquivo .env do frontend.')

      const response = await fetch(`${apiUrl}/api/inventory/saida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ fabricId, quantity, cuttingOrderId, notes }),
      })

      const data = await parseApiResponse(response)
      if (!response.ok) throw new Error(data.message || `Erro ${response.status} ao registrar saída.`)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /** Busca o Kardex de um tecido específico, com filtros opcionais de data */
  const fetchKardex = useCallback(async (fabricId, { limit = 50, offset = 0, dateFrom, dateTo } = {}) => {
    let query = supabase
      .from('vw_kardex')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('fabric_id', fabricId)
      .order('created_at', { ascending: false })

    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo)   query = query.lte('created_at', dateTo + 'T23:59:59')

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error
    return data
  }, [tenantId])

  return {
    loading,
    error,
    fetchFabrics,
    fetchFabricById,
    createFabric,
    updateFabric,
    deactivateFabric,
    registerEntry,
    registerExit,
    fetchKardex,
  }
}
