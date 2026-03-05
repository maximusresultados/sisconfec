-- =============================================================================
-- MIGRAÇÃO: Ordens de Reposição de Estoque
-- Aplique via Supabase SQL Editor ou Management API
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABELA: purchase_orders (Ordens de Compra / Reposição)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number  VARCHAR(50)  NOT NULL,
  supplier      VARCHAR(255) NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pendente'
                             CHECK (status IN ('pendente', 'aprovado', 'enviado', 'recebido', 'cancelado')),
  expected_date DATE,
  received_at   TIMESTAMPTZ,
  notes         TEXT,
  created_by    UUID         REFERENCES profiles(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_po_number UNIQUE (tenant_id, order_number)
);

COMMENT ON TABLE purchase_orders IS 'Ordens de compra/reposição de tecidos';

CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(tenant_id, status);


-- ---------------------------------------------------------------------------
-- TABELA: purchase_order_items (Itens da Ordem de Reposição)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_order_id UUID           NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  fabric_id         UUID           NOT NULL REFERENCES fabrics(id),
  quantity_ordered  DECIMAL(12, 3) NOT NULL CHECK (quantity_ordered > 0),
  unit_cost         DECIMAL(12, 4),
  quantity_received DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE purchase_order_items IS 'Itens (tecidos) de uma ordem de reposição';

CREATE INDEX IF NOT EXISTS idx_poi_order  ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_fabric ON purchase_order_items(fabric_id);


-- ---------------------------------------------------------------------------
-- TRIGGER: atualiza updated_at (reutiliza set_updated_at() já existente)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_po_updated_at ON purchase_orders;
CREATE TRIGGER trg_po_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS: Políticas de acesso
-- ---------------------------------------------------------------------------
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- purchase_orders: admin e estoquista do mesmo tenant
CREATE POLICY po_tenant_isolation ON purchase_orders
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY po_insert ON purchase_orders FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('admin', 'estoquista')
  );

CREATE POLICY po_update ON purchase_orders FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (get_user_role() IN ('admin', 'estoquista'));

-- purchase_order_items: mesma lógica
CREATE POLICY poi_tenant_isolation ON purchase_order_items
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY poi_insert ON purchase_order_items FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('admin', 'estoquista')
  );
