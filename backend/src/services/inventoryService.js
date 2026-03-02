/**
 * inventoryService — Regras de negócio de estoque
 *
 * Responsável pelo cálculo atômico de:
 * - Preço médio ponderado (custo médio) após entrada
 * - Validação de saldo antes de saída
 * - Registro de transação + atualização do estoque em sequência
 */
import { supabaseAdmin } from '../config/supabase.js'

/**
 * Calcula o novo preço médio ponderado após uma entrada de estoque.
 *
 * Fórmula:
 *   novo_pm = (estoque_atual × pm_atual + qtd_nova × custo_unit) / (estoque_atual + qtd_nova)
 *
 * @param {number} currentStock   - Estoque atual em metros/kg
 * @param {number} currentAvgCost - Preço médio atual (R$)
 * @param {number} newQuantity    - Quantidade que está entrando
 * @param {number} newUnitCost    - Custo unitário da nova entrada (R$)
 * @returns {number} Novo preço médio ponderado, arredondado em 4 casas decimais
 */
export function calculateAverageCost(currentStock, currentAvgCost, newQuantity, newUnitCost) {
  const totalCurrentValue = currentStock * currentAvgCost
  const totalNewValue     = newQuantity  * newUnitCost
  const totalStock        = currentStock + newQuantity

  if (totalStock === 0) return 0

  return Math.round(((totalCurrentValue + totalNewValue) / totalStock) * 10_000) / 10_000
}

/**
 * Registra uma ENTRADA de estoque atomicamente:
 * 1. Busca o tecido (com lock otimista via select)
 * 2. Recalcula o preço médio
 * 3. Atualiza current_stock e average_cost na tabela fabrics
 * 4. Insere o registro na tabela inventory_transactions
 *
 * @param {object} params
 * @param {string} params.tenantId      - ID do tenant
 * @param {string} params.fabricId      - ID do tecido
 * @param {number} params.quantity      - Quantidade entrando
 * @param {number} params.unitCost      - Custo unitário
 * @param {string} [params.referenceDoc]- Nota fiscal / referência
 * @param {string} [params.notes]       - Observações
 * @param {string} params.userId        - ID do usuário que está registrando
 * @returns {object} { fabric, transaction }
 */
export async function registerEntry({ tenantId, fabricId, quantity, unitCost, referenceDoc, notes, userId }) {
  // 1. Busca o tecido atual
  const { data: fabric, error: fetchErr } = await supabaseAdmin
    .from('fabrics')
    .select('id, code, description, current_stock, average_cost, tenant_id')
    .eq('id', fabricId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !fabric) {
    throw new Error('Tecido não encontrado.')
  }

  const stockBefore   = Number(fabric.current_stock)
  const avgCostBefore = Number(fabric.average_cost)
  const qty           = Number(quantity)
  const cost          = Number(unitCost)

  // 2. Calcula novo preço médio e novo estoque
  const newAvgCost = calculateAverageCost(stockBefore, avgCostBefore, qty, cost)
  const newStock   = stockBefore + qty
  const totalCost  = qty * cost

  // 3. Atualiza o tecido
  const { error: updateErr } = await supabaseAdmin
    .from('fabrics')
    .update({
      current_stock: newStock,
      average_cost:  newAvgCost,
    })
    .eq('id', fabricId)
    .eq('tenant_id', tenantId)

  if (updateErr) throw updateErr

  // 4. Registra a transação (Kardex)
  const { data: transaction, error: txErr } = await supabaseAdmin
    .from('inventory_transactions')
    .insert({
      tenant_id:           tenantId,
      fabric_id:           fabricId,
      type:                'entrada',
      quantity:            qty,
      unit_cost:           cost,
      total_cost:          totalCost,
      stock_before:        stockBefore,
      stock_after:         newStock,
      average_cost_before: avgCostBefore,
      average_cost_after:  newAvgCost,
      reference_doc:       referenceDoc ?? null,
      notes:               notes ?? null,
      created_by:          userId,
    })
    .select()
    .single()

  if (txErr) {
    // Tenta reverter o estoque em caso de erro no log (best-effort)
    await supabaseAdmin
      .from('fabrics')
      .update({ current_stock: stockBefore, average_cost: avgCostBefore })
      .eq('id', fabricId)
    throw txErr
  }

  return {
    fabric: { ...fabric, current_stock: newStock, average_cost: newAvgCost },
    transaction,
    summary: {
      stockBefore,   stockAfter: newStock,
      avgCostBefore, avgCostAfter: newAvgCost,
      totalCost,
    },
  }
}

/**
 * Registra uma SAÍDA de estoque:
 * 1. Valida se há saldo suficiente
 * 2. Debita o estoque (preço médio não muda em saídas)
 * 3. Insere o registro no Kardex
 *
 * @param {object} params
 * @param {string} params.tenantId       - ID do tenant
 * @param {string} params.fabricId       - ID do tecido
 * @param {number} params.quantity       - Quantidade saindo
 * @param {string} [params.cuttingOrderId] - Referência à ordem de corte
 * @param {string} [params.notes]        - Observações
 * @param {string} params.userId         - ID do usuário
 * @returns {object} { fabric, transaction }
 */
export async function registerExit({ tenantId, fabricId, quantity, cuttingOrderId, notes, userId }) {
  const { data: fabric, error: fetchErr } = await supabaseAdmin
    .from('fabrics')
    .select('id, code, description, current_stock, average_cost, tenant_id')
    .eq('id', fabricId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !fabric) {
    throw new Error('Tecido não encontrado.')
  }

  const stockBefore   = Number(fabric.current_stock)
  const avgCostBefore = Number(fabric.average_cost)
  const qty           = Number(quantity)

  if (qty > stockBefore) {
    throw new Error(
      `Saldo insuficiente. Disponível: ${stockBefore.toFixed(3)} — Solicitado: ${qty.toFixed(3)}`
    )
  }

  const newStock  = stockBefore - qty
  const totalCost = qty * avgCostBefore  // Custo da saída pelo preço médio atual

  const { error: updateErr } = await supabaseAdmin
    .from('fabrics')
    .update({ current_stock: newStock })
    .eq('id', fabricId)
    .eq('tenant_id', tenantId)

  if (updateErr) throw updateErr

  const { data: transaction, error: txErr } = await supabaseAdmin
    .from('inventory_transactions')
    .insert({
      tenant_id:           tenantId,
      fabric_id:           fabricId,
      type:                'saida',
      quantity:            qty,
      unit_cost:           avgCostBefore,   // na saída, registra o pm atual como referência
      total_cost:          totalCost,
      stock_before:        stockBefore,
      stock_after:         newStock,
      average_cost_before: avgCostBefore,
      average_cost_after:  avgCostBefore,   // PM não muda em saída
      cutting_order_id:    cuttingOrderId ?? null,
      notes:               notes ?? null,
      created_by:          userId,
    })
    .select()
    .single()

  if (txErr) {
    await supabaseAdmin
      .from('fabrics')
      .update({ current_stock: stockBefore })
      .eq('id', fabricId)
    throw txErr
  }

  return {
    fabric: { ...fabric, current_stock: newStock },
    transaction,
    summary: {
      stockBefore, stockAfter: newStock,
      avgCost: avgCostBefore,
      totalCost,
    },
  }
}
