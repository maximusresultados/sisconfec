/**
 * AuthContext — Contexto de Autenticação
 *
 * Provê o usuário autenticado, o perfil (com role e tenant_id)
 * e funções de login/logout para toda a árvore de componentes.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  // Carrega o perfil complementar usando o userId da sessão (sem re-validar JWT)
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, tenant_id, is_active')
        .eq('id', userId)
        .single()
      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        if (session) loadProfile(session.user.id)
      })
      .catch((err) => {
        console.error('Erro ao obter sessão:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    // Listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        // USER_UPDATED (troca de senha) não recarrega perfil — evita deadlock
        if (event === 'USER_UPDATED') return

        if (session) {
          await loadProfile(session.user.id)
          // Registra último acesso apenas no login efetivo
          if (event === 'SIGNED_IN') {
            supabase
              .from('profiles')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('id', session.user.id)
              .then(() => {}) // silencia erros — não crítico
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  // Login com e-mail e senha
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Logout — limpa estado local imediatamente, invalida sessão em background
  async function signOut() {
    setSession(null)
    setProfile(null)
    supabase.auth.signOut() // não aguarda — UX imediata
  }

  // Atualiza o perfil do usuário (full_name) na tabela profiles
  async function updateProfile({ full_name }) {
    if (!session?.user?.id) throw new Error('Usuário não autenticado.')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name })
      .eq('id', session.user.id)
    if (error) throw error
    setProfile(p => ({ ...p, full_name }))
  }

  // Verifica se o usuário possui uma das roles permitidas
  function hasRole(...roles) {
    return profile ? roles.includes(profile.role) : false
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    signOut,
    updateProfile,
    hasRole,
    isAdmin:        () => hasRole('admin'),
    isEstoquista:   () => hasRole('admin', 'estoquista'),
    isCortador:     () => hasRole('admin', 'encarregado_corte'),
    isGestorFaccao: () => hasRole('admin', 'gestor_faccao'),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
