-- ============================================================
-- Migration 002 — Estoque de Reserva
-- View vw_fabric_stock: current_stock + reserved_stock + available_stock
-- Aplicar no Supabase Dashboard > SQL Editor
-- ============================================================

CREATE OR REPLACE VIEW vw_fabric_stock AS
SELECT
  f.*,
  COALESCE(
    (SELECT SUM(co.quantity_meters)
     FROM cutting_orders co
     WHERE co.fabric_id  = f.id
       AND co.tenant_id  = f.tenant_id
       AND co.status NOT IN ('aprovado', 'cancelado')
       AND co.quantity_meters IS NOT NULL),
    0
  )::DECIMAL(12,3) AS reserved_stock,
  (f.current_stock - COALESCE(
    (SELECT SUM(co.quantity_meters)
     FROM cutting_orders co
     WHERE co.fabric_id  = f.id
       AND co.tenant_id  = f.tenant_id
       AND co.status NOT IN ('aprovado', 'cancelado')
       AND co.quantity_meters IS NOT NULL),
    0
  ))::DECIMAL(12,3) AS available_stock
FROM fabrics f
WHERE f.is_active = true;

COMMENT ON VIEW vw_fabric_stock IS
  'Tecidos com estoque atual, reservado (ordens em aberto) e disponível';
