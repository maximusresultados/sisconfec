/**
 * Rotas de Usuários — /api/users
 *
 * Endpoints (admin only):
 *   POST /api/users — Cria usuário no Supabase Auth + insere profile
 */
import { Router } from 'express'
import { z }      from 'zod'
import { authenticate, authorize } from '../middleware/auth.js'
import { supabaseAdmin as adminClient } from '../config/supabase.js'

const router = Router()
router.use(authenticate)
router.use(authorize('admin'))

const createUserSchema = z.object({
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  role:      z.enum(['admin', 'estoquista', 'encarregado_corte', 'gestor_faccao']),
})

/**
 * POST /api/users
 * Cria um novo usuário Auth + profile para o tenant do solicitante.
 */
router.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(422).json({
      message: 'Dados inválidos',
      errors:  parsed.error.flatten().fieldErrors,
    })
  }

  const { email, password, full_name, role } = parsed.data
  const tenantId = req.user.tenant_id

  try {
    // 1. Cria o usuário no Supabase Auth (Admin API — service_role)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw authError

    const userId = authData.user.id

    // 2. Insere o profile na tabela profiles
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id:        userId,
        tenant_id: tenantId,
        full_name,
        email,
        role,
        is_active: true,
      })

    if (profileError) {
      // Rollback: remove o usuário Auth se o profile falhou
      await adminClient.auth.admin.deleteUser(userId).catch(() => {})
      throw profileError
    }

    return res.status(201).json({
      message: 'Usuário criado com sucesso.',
      user: { id: userId, email, full_name, role },
    })
  } catch (err) {
    const msg = err.message ?? 'Erro ao criar usuário.'
    if (msg.includes('already been registered') || err.code === '23505') {
      return res.status(409).json({ message: 'Este e-mail já está cadastrado.' })
    }
    return res.status(500).json({ message: msg })
  }
})

export default router
