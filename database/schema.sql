-- =============================================================================
-- SISCONFEC — Schema Principal do Banco de Dados
-- Supabase / PostgreSQL
--
-- Modelo Multi-Tenant com RBAC por Row Level Security (RLS)
-- Perfis: admin | estoquista | encarregado_corte | gestor_faccao
-- =============================================================================


-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Buscas textuais eficientes


-- ---------------------------------------------------------------------------
-- TABELA: tenants (Empresas / Multi-Tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,           -- ex: "confeccao-abc"
  plan        VARCHAR(30)  NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Empresas clientes do SisConfec (Multi-Tenant)';


-- ---------------------------------------------------------------------------
-- TABELA: profiles (Perfis de usuário — estende auth.users do Supabase)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name   VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  role        VARCHAR(30)  NOT NULL DEFAULT 'estoquista'
                           CHECK (role IN ('admin', 'estoquista', 'encarregado_corte', 'gestor_faccao')),
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Perfis de usuário com tenant e role (RBAC)';
COMMENT ON COLUMN profiles.role IS 'admin=acesso total | estoquista=estoque | encarregado_corte=corte | gestor_faccao=facção';

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON profiles(tenant_id, role);


-- ---------------------------------------------------------------------------
-- TABELA: fabrics (Tecidos — Cadastro de Estoque)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fabrics (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code             VARCHAR(50)    NOT NULL,              -- Código interno
  description      VARCHAR(255)   NOT NULL,              -- Descrição do tecido
  color            VARCHAR(100),                         -- Cor
  supplier         VARCHAR(255),                         -- Fornecedor
  unit             VARCHAR(20)    NOT NULL DEFAULT 'metro' CHECK (unit IN ('metro', 'kg', 'peca')),
  current_stock    DECIMAL(12, 3) NOT NULL DEFAULT 0,    -- Estoque atual (metros/kg)
  average_cost     DECIMAL(12, 4) NOT NULL DEFAULT 0,    -- Preço médio ponderado
  minimum_stock    DECIMAL(12, 3) NOT NULL DEFAULT 0,    -- Estoque mínimo (alerta)
  is_active        BOOLEAN        NOT NULL DEFAULT true,
  notes            TEXT,
  created_by       UUID           REFERENCES profiles(id),
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_fabric_code_tenant UNIQUE (tenant_id, code)
);

COMMENT ON TABLE fabrics IS 'Cadastro de rolos de tecido com controle de estoque e preço médio';
COMMENT ON COLUMN fabrics.average_cost IS 'Preço médio ponderado — recalculado a cada entrada pelo backend';

CREATE INDEX IF NOT EXISTS idx_fabrics_tenant     ON fabrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_code       ON fabrics(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_fabrics_low_stock  ON fabrics(tenant_id) WHERE current_stock <= minimum_stock;


-- ---------------------------------------------------------------------------
-- TABELA: inventory_transactions (Kardex — Entradas e Saídas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id                   UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fabric_id            UUID           NOT NULL REFERENCES fabrics(id),
  type                 VARCHAR(20)    NOT NULL CHECK (type IN ('entrada', 'saida')),

  -- Quantidades e custos
  quantity             DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost            DECIMAL(12, 4),                   -- Custo unitário (só em entrada)
  total_cost           DECIMAL(12, 4),                   -- quantity × unit_cost

  -- Snapshot do estoque antes/depois (para o Kardex)
  stock_before         DECIMAL(12, 3) NOT NULL DEFAULT 0,
  stock_after          DECIMAL(12, 3) NOT NULL DEFAULT 0,
  average_cost_before  DECIMAL(12, 4) NOT NULL DEFAULT 0,
  average_cost_after   DECIMAL(12, 4) NOT NULL DEFAULT 0,

  -- Referências externas
  reference_doc        VARCHAR(100),                     -- Nota fiscal, NF, pedido
  cutting_order_id     UUID,                             -- FK adicionada após a tabela cutting_orders
  notes                TEXT,

  created_by           UUID           REFERENCES profiles(id),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventory_transactions IS 'Kardex: histórico completo de entradas e saídas por tecido';

CREATE INDEX IF NOT EXISTS idx_inv_tx_tenant    ON inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_fabric    ON inventory_transactions(fabric_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_type      ON inventory_transactions(tenant_id, type, created_at DESC);


-- ---------------------------------------------------------------------------
-- TABELA: cutting_orders (Pedidos / Ordens de Corte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cutting_orders (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number      VARCHAR(50) NOT NULL,               -- Número do pedido (ex: OC-2025-001)
  description       VARCHAR(255),                       -- Descrição do produto
  status            VARCHAR(30) NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente', 'em_corte', 'cortado', 'em_revisao', 'aprovado', 'cancelado')),
  fabric_id         UUID        REFERENCES fabrics(id),

  -- Quantidade de metros necessária
  quantity_meters   DECIMAL(12, 3),

  -- Grade de tamanhos (quantidades planejadas)
  qty_pp            INTEGER     NOT NULL DEFAULT 0 CHECK (qty_pp >= 0),
  qty_p             INTEGER     NOT NULL DEFAULT 0 CHECK (qty_p  >= 0),
  qty_m             INTEGER     NOT NULL DEFAULT 0 CHECK (qty_m  >= 0),
  qty_g             INTEGER     NOT NULL DEFAULT 0 CHECK (qty_g  >= 0),
  qty_gg            INTEGER     NOT NULL DEFAULT 0 CHECK (qty_gg >= 0),
  qty_xgg           INTEGER     NOT NULL DEFAULT 0 CHECK (qty_xgg >= 0),

  -- Total calculado (coluna gerada)
  total_pieces      INTEGER     GENERATED ALWAYS AS (qty_pp + qty_p + qty_m + qty_g + qty_gg + qty_xgg) STORED,

  priority          VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  due_date          DATE,
  notes             TEXT,
  created_by        UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_cutting_order_number UNIQUE (tenant_id, order_number)
);

COMMENT ON TABLE cutting_orders IS 'Ordens de corte com grade de tamanhos e status de produção';

CREATE INDEX IF NOT EXISTS idx_co_tenant  ON cutting_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_co_status  ON cutting_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_co_fabric  ON cutting_orders(fabric_id);

-- Adiciona FK de inventory_transactions → cutting_orders (referência cruzada)
ALTER TABLE inventory_transactions
  ADD CONSTRAINT fk_inv_tx_cutting_order
  FOREIGN KEY (cutting_order_id) REFERENCES cutting_orders(id);


-- ---------------------------------------------------------------------------
-- TABELA: cutting_executions (Execução e Revisão do Corte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cutting_executions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cutting_order_id  UUID        NOT NULL REFERENCES cutting_orders(id) ON DELETE RESTRICT,

  -- Quantidades efetivamente cortadas
  actual_qty_pp     INTEGER     NOT NULL DEFAULT 0 CHECK (actual_qty_pp  >= 0),
  actual_qty_p      INTEGER     NOT NULL DEFAULT 0 CHECK (actual_qty_p   >= 0),
  actual_qty_m      INTEGER     NOT NULL DEFAULT 0 CHECK (actual_qty_m   >= 0),
  actual_qty_g      INTEGER     NOT NULL DEFAULT 0 CHECK (actual_qty_g   >= 0),
  actual_qty_gg     INTEGER     NOT NULL DEFAULT 0 CHECK (actual_qty_gg  >= 0),
  actual_qty_xgg    INTEGER     NOT NULL DEFAULT 0 CHECK (actual_qty_xgg >= 0),
  actual_total      INTEGER     GENERATED ALWAYS AS (actual_qty_pp + actual_qty_p + actual_qty_m + actual_qty_g + actual_qty_gg + actual_qty_xgg) STORED,

  meters_used       DECIMAL(12, 3),                      -- Metros reais consumidos

  -- Revisão de qualidade
  review_status     VARCHAR(20) NOT NULL DEFAULT 'pendente'
                                CHECK (review_status IN ('pendente', 'aprovado', 'reprovado')),
  review_notes      TEXT,
  reviewed_by       UUID        REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,

  executed_by       UUID        REFERENCES profiles(id),
  executed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cutting_executions IS 'Registro da execução física do corte e revisão de qualidade';

CREATE INDEX IF NOT EXISTS idx_ce_tenant ON cutting_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ce_order  ON cutting_executions(cutting_order_id);


-- ---------------------------------------------------------------------------
-- TABELA: seamstresses (Costureiras / Parceiras de Facção)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seamstresses (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255)   NOT NULL,
  document        VARCHAR(50),                          -- CPF ou CNPJ
  phone           VARCHAR(30),
  whatsapp        VARCHAR(30),
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(2),
  payment_type    VARCHAR(20)    NOT NULL DEFAULT 'por_peca'
                                 CHECK (payment_type IN ('por_peca', 'por_lote', 'fixo')),
  price_per_piece DECIMAL(10, 4),                       -- Valor por peça
  is_active       BOOLEAN        NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE seamstresses IS 'Cadastro de costureiras externas (facção)';

CREATE INDEX IF NOT EXISTS idx_seamstresses_tenant ON seamstresses(tenant_id);


-- ---------------------------------------------------------------------------
-- TABELA: faction_dispatches (Remessas para Facção)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faction_dispatches (
  id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dispatch_number       VARCHAR(50)    NOT NULL,          -- Ex: FAC-2025-001
  seamstress_id         UUID           NOT NULL REFERENCES seamstresses(id),
  cutting_execution_id  UUID           REFERENCES cutting_executions(id),
  status                VARCHAR(30)    NOT NULL DEFAULT 'enviado'
                                       CHECK (status IN ('enviado', 'em_producao', 'retornado', 'pago', 'cancelado')),

  -- Datas
  dispatched_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  expected_return_date  DATE,
  returned_at           TIMESTAMPTZ,

  -- Peças enviadas
  qty_pp_sent           INTEGER        NOT NULL DEFAULT 0 CHECK (qty_pp_sent  >= 0),
  qty_p_sent            INTEGER        NOT NULL DEFAULT 0 CHECK (qty_p_sent   >= 0),
  qty_m_sent            INTEGER        NOT NULL DEFAULT 0 CHECK (qty_m_sent   >= 0),
  qty_g_sent            INTEGER        NOT NULL DEFAULT 0 CHECK (qty_g_sent   >= 0),
  qty_gg_sent           INTEGER        NOT NULL DEFAULT 0 CHECK (qty_gg_sent  >= 0),
  qty_xgg_sent          INTEGER        NOT NULL DEFAULT 0 CHECK (qty_xgg_sent >= 0),
  total_sent            INTEGER        GENERATED ALWAYS AS (qty_pp_sent + qty_p_sent + qty_m_sent + qty_g_sent + qty_gg_sent + qty_xgg_sent) STORED,

  -- Peças retornadas
  qty_pp_returned       INTEGER        NOT NULL DEFAULT 0 CHECK (qty_pp_returned  >= 0),
  qty_p_returned        INTEGER        NOT NULL DEFAULT 0 CHECK (qty_p_returned   >= 0),
  qty_m_returned        INTEGER        NOT NULL DEFAULT 0 CHECK (qty_m_returned   >= 0),
  qty_g_returned        INTEGER        NOT NULL DEFAULT 0 CHECK (qty_g_returned   >= 0),
  qty_gg_returned       INTEGER        NOT NULL DEFAULT 0 CHECK (qty_gg_returned  >= 0),
  qty_xgg_returned      INTEGER        NOT NULL DEFAULT 0 CHECK (qty_xgg_returned >= 0),
  total_returned        INTEGER        GENERATED ALWAYS AS (qty_pp_returned + qty_p_returned + qty_m_returned + qty_g_returned + qty_gg_returned + qty_xgg_returned) STORED,

  -- Pagamento
  payment_status        VARCHAR(20)    NOT NULL DEFAULT 'pendente'
                                       CHECK (payment_status IN ('pendente', 'pago', 'cancelado')),
  payment_value         DECIMAL(12, 4),
  payment_date          DATE,
  payment_notes         TEXT,

  notes                 TEXT,
  created_by            UUID           REFERENCES profiles(id),
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_dispatch_number UNIQUE (tenant_id, dispatch_number)
);

COMMENT ON TABLE faction_dispatches IS 'Remessas de lotes cortados para costureiras externas (facção)';

CREATE INDEX IF NOT EXISTS idx_fd_tenant     ON faction_dispatches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fd_seamstress ON faction_dispatches(seamstress_id);
CREATE INDEX IF NOT EXISTS idx_fd_status     ON faction_dispatches(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fd_payment    ON faction_dispatches(tenant_id, payment_status);


-- =============================================================================
-- FUNÇÕES AUXILIARES (usadas pelas políticas RLS)
-- =============================================================================

-- NOTA: Funções criadas no schema PUBLIC (Management API não permite schema auth)

-- Retorna o tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Retorna a role do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS
$func$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$func$;

-- Verifica se o usuário tem determinada role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role VARCHAR)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = required_role AND is_active = true
  );
$$;

-- Verifica se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT public.user_has_role('admin');
$$;


-- =============================================================================
-- TRIGGERS: updated_at automático
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_fabrics_updated_at
  BEFORE UPDATE ON fabrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cutting_orders_updated_at
  BEFORE UPDATE ON cutting_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_seamstresses_updated_at
  BEFORE UPDATE ON seamstresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_faction_dispatches_updated_at
  BEFORE UPDATE ON faction_dispatches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — Políticas de Acesso
-- =============================================================================
-- Princípio: usuários só acessam dados do próprio tenant.
--            Dentro do tenant, as roles definem o que podem criar/alterar.
-- =============================================================================

-- Ativa RLS em todas as tabelas de dados
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabrics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_executions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE seamstresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE faction_dispatches  ENABLE ROW LEVEL SECURITY;


-- ------- PROFILES -------

-- Qualquer usuário autenticado lê apenas seu próprio perfil ou perfis do tenant (admin)
-- NOTA: Políticas usam public.* (funções no schema public)

CREATE POLICY "profiles_select"        ON profiles FOR SELECT      USING      (tenant_id = public.get_user_tenant_id());
CREATE POLICY "profiles_insert_admin"  ON profiles FOR INSERT      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin());
CREATE POLICY "profiles_update"        ON profiles FOR UPDATE      USING      (tenant_id = public.get_user_tenant_id() AND (public.is_admin() OR id = auth.uid()));

CREATE POLICY "fabrics_select"  ON fabrics FOR SELECT      USING      (tenant_id = public.get_user_tenant_id());
CREATE POLICY "fabrics_insert"  ON fabrics FOR INSERT      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'estoquista'));
CREATE POLICY "fabrics_update"  ON fabrics FOR UPDATE      USING      (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'estoquista'));
CREATE POLICY "fabrics_delete"  ON fabrics FOR DELETE      USING      (tenant_id = public.get_user_tenant_id() AND public.is_admin());

-- Kardex é imutável — sem UPDATE/DELETE por usuários
CREATE POLICY "inv_tx_select"   ON inventory_transactions FOR SELECT      USING      (tenant_id = public.get_user_tenant_id());
CREATE POLICY "inv_tx_insert"   ON inventory_transactions FOR INSERT      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'estoquista'));

CREATE POLICY "co_select"  ON cutting_orders FOR SELECT      USING      (tenant_id = public.get_user_tenant_id());
CREATE POLICY "co_insert"  ON cutting_orders FOR INSERT      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'encarregado_corte'));
CREATE POLICY "co_update"  ON cutting_orders FOR UPDATE      USING      (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'encarregado_corte'));

CREATE POLICY "ce_select"  ON cutting_executions FOR SELECT      USING      (tenant_id = public.get_user_tenant_id());
CREATE POLICY "ce_insert"  ON cutting_executions FOR INSERT      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'encarregado_corte'));
CREATE POLICY "ce_update"  ON cutting_executions FOR UPDATE      USING      (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'encarregado_corte'));

CREATE POLICY "seamstresses_select"  ON seamstresses FOR SELECT      USING      (tenant_id = public.get_user_tenant_id());
CREATE POLICY "seamstresses_insert"  ON seamstresses FOR INSERT      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'gestor_faccao'));
CREATE POLICY "seamstresses_update"  ON seamstresses FOR UPDATE      USING      (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'gestor_faccao'));

CREATE POLICY "fd_select"  ON faction_dispatches FOR SELECT      USING      (tenant_id = public.get_user_tenant_id());
CREATE POLICY "fd_insert"  ON faction_dispatches FOR INSERT      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'gestor_faccao'));
CREATE POLICY "fd_update"  ON faction_dispatches FOR UPDATE      USING      (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'gestor_faccao'));


-- =============================================================================
-- VIEWS (auxiliares para relatórios e dashboard)
-- =============================================================================

-- View: alertas de estoque abaixo do mínimo
CREATE OR REPLACE VIEW vw_low_stock_alerts AS
SELECT
  f.id,
  f.tenant_id,
  f.code,
  f.description,
  f.color,
  f.supplier,
  f.current_stock,
  f.minimum_stock,
  f.unit,
  f.average_cost,
  ROUND((f.current_stock - f.minimum_stock)::NUMERIC, 3) AS stock_gap
FROM fabrics f
WHERE f.is_active = true
  AND f.current_stock <= f.minimum_stock;

COMMENT ON VIEW vw_low_stock_alerts IS 'Tecidos com estoque igual ou abaixo do mínimo';


-- View: resumo de facção por costureira (total enviado, retornado, pendente de pagamento)
CREATE OR REPLACE VIEW vw_faction_summary AS
SELECT
  s.tenant_id,
  s.id            AS seamstress_id,
  s.name          AS seamstress_name,
  COUNT(fd.id)    AS total_dispatches,
  SUM(fd.total_sent)     AS total_pieces_sent,
  SUM(fd.total_returned) AS total_pieces_returned,
  SUM(
    CASE WHEN fd.payment_status = 'pendente' THEN fd.payment_value ELSE 0 END
  )               AS total_pending_payment
FROM seamstresses s
LEFT JOIN faction_dispatches fd ON fd.seamstress_id = s.id
WHERE s.is_active = true
GROUP BY s.tenant_id, s.id, s.name;

COMMENT ON VIEW vw_faction_summary IS 'Resumo de facção por costureira';


-- View: Kardex resumido por tecido (últimas 30 movimentações)
CREATE OR REPLACE VIEW vw_kardex AS
SELECT
  it.id,
  it.tenant_id,
  it.fabric_id,
  f.code          AS fabric_code,
  f.description   AS fabric_description,
  it.type,
  it.quantity,
  it.unit_cost,
  it.total_cost,
  it.stock_before,
  it.stock_after,
  it.average_cost_before,
  it.average_cost_after,
  it.reference_doc,
  it.notes,
  p.full_name     AS created_by_name,
  it.created_at
FROM inventory_transactions it
JOIN fabrics f    ON f.id = it.fabric_id
LEFT JOIN profiles p ON p.id = it.created_by;

COMMENT ON VIEW vw_kardex IS 'Extrato completo de movimentações de estoque (Kardex)';


-- =============================================================================
-- DADOS INICIAIS (Seed)
-- =============================================================================

-- Tenant de demonstração (remova em produção)
INSERT INTO tenants (id, name, slug, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Confecção Demo LTDA',
  'confeccao-demo',
  'professional'
) ON CONFLICT DO NOTHING;


-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
-- Para aplicar: cole este arquivo no SQL Editor do painel do Supabase.
-- Ordem de execução: extensões → tabelas → funções → triggers → RLS → views → seed
-- =============================================================================
