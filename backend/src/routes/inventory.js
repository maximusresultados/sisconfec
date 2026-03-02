/**
 * Rotas de Estoque — /api/inventory
 *
 * Endpoints:
 *   POST /api/inventory/entrada              — Registra entrada + recalcula preço médio
 *   POST /api/inventory/saida               — Registra saída com validação de saldo
 *   POST /api/inventory/calculate-average-price — Calcula PM sem persistir (dry-run)
 */
import { Router } from 'express'
import { z }      from 'zod'
import { authenticate, authorize } from '../middleware/auth.js'
import { registerEntry, registerExit, calculateAverageCost } from '../services/inventoryService.js'

const router = Router()

// Todas as rotas deste router exigem autenticação
router.use(authenticate)

// ------- SCHEMAS DE VALIDAÇÃO (Zod) -------

const entrySchema = z.object({
  fabricId:     z.string().uuid('fabricId deve ser UUID'),
  quantity:     z.number().positive('Quantidade deve ser positiva'),
  unitCost:     z.number().positive('Custo unitário deve ser positivo'),
  referenceDoc: z.string().max(100).optional(),
  notes:        z.string().max(500).optional(),
})

const exitSchema = z.object({
  fabricId:       z.string().uuid('fabricId deve ser UUID'),
  quantity:       z.number().positive('Quantidade deve ser positiva'),
  cuttingOrderId: z.string().uuid().optional(),
  notes:          z.string().max(500).optional(),
})

const calcSchema = z.object({
  currentStock:   z.number().min(0),
  currentAvgCost: z.number().min(0),
  newQuantity:    z.number().positive(),
  newUnitCost:    z.number().positive(),
})

// ------- ENDPOINT: Calcular preço médio (dry-run, sem persistir) -------
/**
 * POST /api/inventory/calculate-average-price
 *
 * Recebe os parâmetros de estoque e retorna o novo preço médio
 * sem registrar nada no banco. Útil para preview antes de confirmar entrada.
 *
 * Body: { currentStock, currentAvgCost, newQuantity, newUnitCost }
 */
router.post('/calculate-average-price', (req, res) => {
  const result = calcSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(422).json({
      message: 'Dados inválidos',
      errors:  result.error.flatten().fieldErrors,
    })
  }

  const { currentStock, currentAvgCost, newQuantity, newUnitCost } = result.data

  const newAvgCost = calculateAverageCost(currentStock, currentAvgCost, newQuantity, newUnitCost)
  const totalCost  = newQuantity * newUnitCost
  const newStock   = currentStock + newQuantity

  return res.json({
    currentStock,
    currentAvgCost,
    newQuantity,
    newUnitCost,
    totalCost:      Math.round(totalCost      * 10_000) / 10_000,
    newStock:       Math.round(newStock       * 1_000)  / 1_000,
    newAvgCost,
  })
})

// ------- ENDPOINT: Registrar Entrada -------
/**
 * POST /api/inventory/entrada
 * Roles: admin, estoquista
 *
 * Body: { fabricId, quantity, unitCost, referenceDoc?, notes? }
 */
router.post(
  '/entrada',
  authorize('admin', 'estoquista'),
  async (req, res) => {
    const result = entrySchema.safeParse(req.body)

    if (!result.success) {
      return res.status(422).json({
        message: 'Dados inválidos',
        errors:  result.error.flatten().fieldErrors,
      })
    }

    const data = await registerEntry({
      ...result.data,
      tenantId: req.user.tenant_id,
      userId:   req.user.id,
    })

    return res.status(201).json({
      message: 'Entrada registrada com sucesso.',
      ...data,
    })
  }
)

// ------- ENDPOINT: Registrar Saída -------
/**
 * POST /api/inventory/saida
 * Roles: admin, estoquista
 *
 * Body: { fabricId, quantity, cuttingOrderId?, notes? }
 */
router.post(
  '/saida',
  authorize('admin', 'estoquista'),
  async (req, res) => {
    const result = exitSchema.safeParse(req.body)

    if (!result.success) {
      return res.status(422).json({
        message: 'Dados inválidos',
        errors:  result.error.flatten().fieldErrors,
      })
    }

    const data = await registerExit({
      ...result.data,
      tenantId: req.user.tenant_id,
      userId:   req.user.id,
    })

    return res.status(201).json({
      message: 'Saída registrada com sucesso.',
      ...data,
    })
  }
)

export default router
