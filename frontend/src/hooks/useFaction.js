/**
 * useFaction — Hook de gerenciamento de facção e costureiras
 */
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import * as qc from '@/lib/queryCache'

export function useFaction() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ------- COSTUREIRAS -------

  const fetchSeamstresses = useCallback(async (filters = {}) => {
    const noFilters = Object.keys(filters).length === 0
    const cacheKey  = `seamstresses:${tenantId}`

    if (noFilters) {
      const cached = qc.get(cacheKey)
      if (cached) return cached
    }

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
      if (noFilters) qc.set(cacheKey, data)
      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const fetchSeamstressSummary = useCallback(async () => {
    const { data, error } = await supabase
      .from('vw_faction_summary')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) throw error
    return data ?? []
  }, [tenantId])

  const createSeamstress = useCallback(async (data) => {
    const { data: result, error } = await supabase
      .from('seamstresses')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`seamstresses:${tenantId}`)
    return result
  }, [tenantId, profile?.id])

  const updateSeamstress = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('seamstresses')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`seamstresses:${tenantId}`)
    return data
  }, [tenantId])

  const deactivateSeamstress = useCallback(async (id) => {
    return updateSeamstress(id, { is_active: false })
  }, [updateSeamstress])

  // ------- REMESSAS DE FACÇÃO -------

  const fetchDispatches = useCallback(async (filters = {}) => {
    const noFilters = Object.keys(filters).length === 0
    const cacheKey  = `dispatches:${tenantId}`

    if (noFilters) {
      const cached = qc.get(cacheKey)
      if (cached) return cached
    }

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

      if (filters.status)         query = query.eq('status', filters.status)
      if (filters.payment_status) query = query.eq('payment_status', filters.payment_status)
      if (filters.search)         query = query.ilike('dispatch_number', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      if (noFilters) qc.set(cacheKey, data)
      return data
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const createDispatch = useCallback(async (data) => {
    const { data: result, error } = await supabase
      .from('faction_dispatches')
      .insert({ ...data, tenant_id: tenantId, created_by: profile?.id })
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`dispatches:${tenantId}`)
    return result
  }, [tenantId, profile?.id])

  const registerReturn = useCallback(async (id, returnData) => {
    const { data, error } = await supabase
      .from('faction_dispatches')
      .update({ ...returnData, status: 'retornado' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`dispatches:${tenantId}`)
    return data
  }, [tenantId])

  const registerPayment = useCallback(async (id, paymentData) => {
    const { data, error } = await supabase
      .from('faction_dispatches')
      .update({ ...paymentData, payment_status: 'pago', status: 'pago' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`dispatches:${tenantId}`)
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
