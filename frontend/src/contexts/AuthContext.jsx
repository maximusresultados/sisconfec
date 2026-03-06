/**
 * AuthContext — Contexto de Autenticação
 *
 * Provê o usuário autenticado, o perfil (com role e tenant_id)
 * e funções de login/logout para toda a árvore de componentes.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getUserProfile } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  // Carrega o perfil complementar (role, tenant_id) após autenticação
  const loadProfile = useCallback(async () => {
    try {
      const profileData = await getUserProfile()
      setProfile(profileData)
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
        if (session) loadProfile()
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
        if (session) {
          await loadProfile()
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

  // Logout
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
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
