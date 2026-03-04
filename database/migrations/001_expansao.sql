-- ============================================================
-- Migration 001 — Expansão: Ficha Técnica + Campos de Tecido
-- Aplicar no Supabase Dashboard > SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Novos campos técnicos em fabrics
-- ------------------------------------------------------------
ALTER TABLE fabrics
  ADD COLUMN IF NOT EXISTS composition            VARCHAR(255),
  ADD COLUMN IF NOT EXISTS width_cm               DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS weight_kg_per_meter    DECIMAL(8,4),
  ADD COLUMN IF NOT EXISTS grammage               DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS yield_pieces_per_meter DECIMAL(8,4);

COMMENT ON COLUMN fabrics.composition             IS 'Composição do tecido (ex: 95% poliéster, 5% elastano)';
COMMENT ON COLUMN fabrics.width_cm                IS 'Largura do tecido em cm';
COMMENT ON COLUMN fabrics.weight_kg_per_meter     IS 'Peso em kg por metro';
COMMENT ON COLUMN fabrics.grammage                IS 'Gramatura em g/m²';
COMMENT ON COLUMN fabrics.yield_pieces_per_meter  IS 'Rendimento: peças por metro';


-- ------------------------------------------------------------
-- 2. Tabela technical_sheets (Fichas Técnicas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technical_sheets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),
  description  TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_by   UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_technical_sheet_code_tenant UNIQUE (tenant_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_technical_sheets_tenant
  ON technical_sheets(tenant_id) WHERE is_active = true;

COMMENT ON TABLE technical_sheets IS 'Fichas técnicas de produtos (calças, blusas, etc.)';


-- ------------------------------------------------------------
-- 3. Tabela technical_sheet_items (Insumos da Ficha Técnica)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technical_sheet_items (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID         NOT NULL,
  technical_sheet_id UUID         NOT NULL REFERENCES technical_sheets(id) ON DELETE CASCADE,
  item_type          VARCHAR(50)  CHECK (item_type IN ('tecido','linha','botao','ziper','elastico','outro')),
  description        VARCHAR(255) NOT NULL,
  color              VARCHAR(100),
  quantity_per_piece DECIMAL(10,4),
  unit               VARCHAR(20)  CHECK (unit IN ('metro','cm','unidade','g','kg')),
  notes              TEXT,
  sort_order         INTEGER      NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technical_sheet_items_sheet
  ON technical_sheet_items(technical_sheet_id);

COMMENT ON TABLE technical_sheet_items IS 'Insumos/materiais de uma ficha técnica';


-- ------------------------------------------------------------
-- 4. FK em cutting_orders → technical_sheets
-- ------------------------------------------------------------
ALTER TABLE cutting_orders
  ADD COLUMN IF NOT EXISTS technical_sheet_id UUID REFERENCES technical_sheets(id);

COMMENT ON COLUMN cutting_orders.technical_sheet_id IS 'Ficha técnica do produto sendo cortado';


-- ------------------------------------------------------------
-- 5. FK em faction_dispatches → cutting_orders
-- ------------------------------------------------------------
ALTER TABLE faction_dispatches
  ADD COLUMN IF NOT EXISTS cutting_order_id UUID REFERENCES cutting_orders(id);

COMMENT ON COLUMN faction_dispatches.cutting_order_id IS 'Ordem de corte vinculada a esta remessa';


-- ------------------------------------------------------------
-- 6. Trigger updated_at para technical_sheets
-- ------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_technical_sheets_updated_at
  BEFORE UPDATE ON technical_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- 7. RLS — technical_sheets
-- ------------------------------------------------------------
ALTER TABLE technical_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technical_sheets: tenant select"
  ON technical_sheets FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "technical_sheets: admin/encarregado insert"
  ON technical_sheets FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND get_user_role(auth.uid()) IN ('admin', 'encarregado_corte')
  );

CREATE POLICY "technical_sheets: admin/encarregado update"
  ON technical_sheets FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'encarregado_corte'));


-- ------------------------------------------------------------
-- 8. RLS — technical_sheet_items
-- ------------------------------------------------------------
ALTER TABLE technical_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technical_sheet_items: tenant select"
  ON technical_sheet_items FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "technical_sheet_items: admin/encarregado insert"
  ON technical_sheet_items FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND get_user_role(auth.uid()) IN ('admin', 'encarregado_corte')
  );

CREATE POLICY "technical_sheet_items: admin/encarregado update"
  ON technical_sheet_items FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'encarregado_corte'));

CREATE POLICY "technical_sheet_items: admin/encarregado delete"
  ON technical_sheet_items FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND get_user_role(auth.uid()) IN ('admin', 'encarregado_corte')
  );
