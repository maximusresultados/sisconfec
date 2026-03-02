/**
 * Supabase Admin Client — Backend SisConfec
 *
 * Usa a service_role key que bypassa RLS.
 * NUNCA expor este cliente ao frontend.
 */
import { createClient } from '@supabase/supabase-js'

const url    = process.env.SUPABASE_URL
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !secret) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.')
}

export const supabaseAdmin = createClient(url, secret, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
})
