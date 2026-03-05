/**
 * useCuttingOrders — Hook de gerenciamento de ordens de corte
 */
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import * as qc from '@/lib/queryCache'

export function useCuttingOrders() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ------- ORDENS DE CORTE -------

  const fetchOrders = useCallback(async (filters = {}) => {
    const noFilters = Object.keys(filters).length === 0
    const cacheKey  = `orders:${tenantId}`

    if (noFilters) {
      const cached = qc.get(cacheKey)
      if (cached) return cached
    }

    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('cutting_orders')
        .select(`
          *,
          fabric:fabrics(id, code, description, color),
          technical_sheet:technical_sheets(id, product_code, product_name, product_type, description)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (filters.status)   query = query.eq('status', filters.status)
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.search)   query = query.or(`order_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)

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

  const createOrder = useCallback(async (data) => {
    const { data: result, error } = await supabase
      .from('cutting_orders')
      .insert({ ...data, tenant_id: tenantId, created_by: profile?.id })
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`orders:${tenantId}`)
    return result
  }, [tenantId, profile?.id])

  const updateOrderStatus = useCallback(async (id, status) => {
    const { data, error } = await supabase
      .from('cutting_orders')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`orders:${tenantId}`)
    return data
  }, [tenantId])

  // ------- EXECUÇÕES DE CORTE -------

  const fetchExecutions = useCallback(async (orderId) => {
    const { data, error } = await supabase
      .from('cutting_executions')
      .select('*')
      .eq('cutting_order_id', orderId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }, [tenantId])

  const createExecution = useCallback(async (data) => {
    const { data: result, error } = await supabase
      .from('cutting_executions')
      .insert({ ...data, tenant_id: tenantId, executed_by: profile?.id })
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`orders:${tenantId}`)
    return result
  }, [tenantId, profile?.id])

  const reviewExecution = useCallback(async (id, { review_status, review_notes }) => {
    const { data, error } = await supabase
      .from('cutting_executions')
      .update({
        review_status,
        review_notes,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`orders:${tenantId}`)
    return data
  }, [tenantId, profile?.id])

  return {
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    fetchExecutions,
    createExecution,
    reviewExecution,
  }
}
