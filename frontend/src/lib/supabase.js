/**
 * Cliente Supabase — SisConfec
 *
 * Este módulo exporta a instância única do cliente Supabase
 * para ser reutilizada em toda a aplicação.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
})

/**
 * Retorna o tenant_id do usuário autenticado.
 * Consulta a tabela profiles via RPC auxiliar.
 */
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, tenant_id, is_active')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}
