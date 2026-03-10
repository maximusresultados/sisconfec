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
    const { includeInactive, search } = filters
    const noFilters = !includeInactive && !search
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
        .order('product_name')

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      if (search) {
        query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%`)
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

  const reactivateSheet = useCallback(async (id) => {
    return updateSheet(id, { is_active: true })
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

  // ------- IMAGEM -------

  const uploadImage = useCallback(async (sheetId, file) => {
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = `${tenantId}/${sheetId}/cover.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('technical-sheets')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('technical-sheets')
      .getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('technical_sheets')
      .update({ image_url: publicUrl })
      .eq('id', sheetId)
      .eq('tenant_id', tenantId)

    if (updateError) throw updateError
    qc.invalidate(`sheets:${tenantId}`)
    return publicUrl
  }, [tenantId])

  const removeImage = useCallback(async (sheetId, imageUrl) => {
    // Remove o arquivo do storage se a URL for conhecida
    if (imageUrl) {
      const marker = '/object/public/technical-sheets/'
      const idx = imageUrl.indexOf(marker)
      if (idx !== -1) {
        const storagePath = decodeURIComponent(imageUrl.slice(idx + marker.length))
        await supabase.storage.from('technical-sheets').remove([storagePath])
      }
    }

    const { error } = await supabase
      .from('technical_sheets')
      .update({ image_url: null })
      .eq('id', sheetId)
      .eq('tenant_id', tenantId)

    if (error) throw error
    qc.invalidate(`sheets:${tenantId}`)
  }, [tenantId])

  return {
    loading, error,
    fetchSheets, fetchSheetById,
    createSheet, updateSheet, deactivateSheet, reactivateSheet,
    addItem, updateItem, removeItem,
    uploadImage, removeImage,
  }
}
