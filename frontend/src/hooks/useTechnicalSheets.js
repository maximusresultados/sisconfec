/**
 * useTechnicalSheets — Hook de gerenciamento de fichas técnicas
 */
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import * as qc from '@/lib/queryCache'

export function useTechnicalSheets() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ------- FICHAS TÉCNICAS -------

  const fetchSheets = useCallback(async (filters = {}) => {
    const noFilters = Object.keys(filters).length === 0
    const cacheKey  = `sheets:${tenantId}`

    if (noFilters) {
      const cached = qc.get(cacheKey)
      if (cached) return cached
    }

    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('technical_sheets')
        .select('*, items:technical_sheet_items(id)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('product_name')

      if (filters.search) {
        query = query.or(`product_name.ilike.%${filters.search}%,product_code.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      const mapped = (data ?? []).map(s => ({ ...s, items_count: s.items?.length ?? 0 }))
      if (noFilters) qc.set(cacheKey, mapped)
      return mapped
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const fetchSheetById = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('technical_sheets')
      .select('*, items:technical_sheet_items(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) throw error
    return data
  }, [tenantId])

  const createSheet = useCallback(async (data) => {
    const { data: result, error } = await supabase
      .from('technical_sheets')
      .insert({ ...data, tenant_id: tenantId, created_by: profile?.id })
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`sheets:${tenantId}`)
    return result
  }, [tenantId, profile?.id])

  const updateSheet = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('technical_sheets')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`sheets:${tenantId}`)
    return data
  }, [tenantId])

  const deactivateSheet = useCallback(async (id) => {
    return updateSheet(id, { is_active: false })
  }, [updateSheet])

  // ------- INSUMOS -------

  const addItem = useCallback(async (sheetId, itemData) => {
    const { data, error } = await supabase
      .from('technical_sheet_items')
      .insert({ ...itemData, technical_sheet_id: sheetId, tenant_id: tenantId })
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`sheets:${tenantId}`)
    return data
  }, [tenantId])

  const updateItem = useCallback(async (itemId, updates) => {
    const { data, error } = await supabase
      .from('technical_sheet_items')
      .update(updates)
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    qc.invalidate(`sheets:${tenantId}`)
    return data
  }, [tenantId])

  const removeItem = useCallback(async (itemId) => {
    const { error } = await supabase
      .from('technical_sheet_items')
      .delete()
      .eq('id', itemId)
      .eq('tenant_id', tenantId)

    if (error) throw error
    qc.invalidate(`sheets:${tenantId}`)
  }, [tenantId])

  return {
    loading, error,
    fetchSheets, fetchSheetById,
    createSheet, updateSheet, deactivateSheet,
    addItem, updateItem, removeItem,
  }
}
