/**
 * Middleware de Autenticação
 *
 * Valida o JWT do Supabase enviado pelo frontend no header Authorization.
 * Adiciona `req.user` com { id, email, role, tenant_id } para as rotas.
 */
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../config/supabase.js'

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticação ausente.' })
  }

  const token = authHeader.slice(7)

  try {
    // Valida o JWT usando o secret do Supabase
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET)

    // Busca o perfil do usuário (role + tenant_id)
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, tenant_id, is_active')
      .eq('id', decoded.sub)
      .single()

    if (error || !profile) {
      return res.status(401).json({ message: 'Usuário não encontrado ou sem perfil.' })
    }

    if (!profile.is_active) {
      return res.status(403).json({ message: 'Conta inativa. Contate o administrador.' })
    }

    req.user = {
      id:        profile.id,
      full_name: profile.full_name,
      role:      profile.role,
      tenant_id: profile.tenant_id,
    }

    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' })
  }
}

/**
 * Factory de middleware de autorização por role.
 * Uso: authorize('admin', 'estoquista')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        message: `Acesso negado. Roles permitidas: ${roles.join(', ')}.`,
      })
    }
    next()
  }
}
