/**
 * useFaction — Hook de gerenciamento de facção e costureiras
 *
 * Encapsula todas as operações de leitura e escrita relacionadas
 * a costureiras e remessas de facção.
 */
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useFaction() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ------- COSTUREIRAS -------

  /** Lista costureiras ativas com filtro opcional de busca */
  const fetchSeamstresses = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('seamstresses')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name')

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
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

  /** Busca resumo financeiro das costureiras via vw_faction_summary */
  const fetchSeamstressSummary = useCallback(async () => {
    const { data, error } = await supabase
      .from('vw_faction_summary')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) throw error
    return data ?? []
  }, [tenantId])

  /** Cria uma nova costureira */
  const createSeamstress = useCallback(async (data) => {
    const { data: result, error } = await supabase
      .from('seamstresses')
      .insert({ ...data, tenant_id: tenantId, created_by: profile?.id })
      .select()
      .single()

    if (error) throw error
    return result
  }, [tenantId, profile?.id])

  /** Atualiza dados de uma costureira */
  const updateSeamstress = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('seamstresses')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return data
  }, [tenantId])

  /** Desativa uma costureira (soft delete) */
  const deactivateSeamstress = useCallback(async (id) => {
    return updateSeamstress(id, { is_active: false })
  }, [updateSeamstress])

  // ------- REMESSAS DE FACÇÃO -------

  /** Lista remessas com JOIN em costureira */
  const fetchDispatches = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('faction_dispatches')
        .select(`
          *,
          seamstress:seamstresses(id, name, price_per_piece)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status)
      }
      if (filters.search) {
        query = query.ilike('dispatch_number', `%${filters.search}%`)
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

  /** Cria uma nova remessa (não inclui total_sent/total_returned — GENERATED) */
  const createDispatch = useCallback(async (data) => {
    const { data: result, error } = await supabase
      .from('faction_dispatches')
      .insert({ ...data, tenant_id: tenantId, created_by: profile?.id })
      .select()
      .single()

    if (error) throw error
    return result
  }, [tenantId, profile?.id])

  /** Registra retorno de uma remessa → status = 'retornado' */
  const registerReturn = useCallback(async (id, returnData) => {
    const { data, error } = await supabase
      .from('faction_dispatches')
      .update({ ...returnData, status: 'retornado' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return data
  }, [tenantId])

  /** Registra pagamento de uma remessa → payment_status = 'pago' + status = 'pago' */
  const registerPayment = useCallback(async (id, paymentData) => {
    const { data, error } = await supabase
      .from('faction_dispatches')
      .update({ ...paymentData, payment_status: 'pago', status: 'pago' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return data
  }, [tenantId])

  return {
    loading,
    error,
    fetchSeamstresses,
    fetchSeamstressSummary,
    createSeamstress,
    updateSeamstress,
    deactivateSeamstress,
    fetchDispatches,
    createDispatch,
    registerReturn,
    registerPayment,
  }
}
