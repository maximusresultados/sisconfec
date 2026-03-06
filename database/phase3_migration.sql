-- ============================================================
-- Phase 3 Migration — Auditoria + Foto nas Fichas Técnicas
-- Executar no Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA DE AUDITORIA
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid        NOT NULL REFERENCES tenants(id),
  user_id     uuid        REFERENCES auth.users(id),
  user_name   text,
  action      text        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name  text        NOT NULL,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant  ON activity_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_table   ON activity_log (table_name);
CREATE INDEX IF NOT EXISTS idx_activity_log_user    ON activity_log (user_id);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Somente leitura para usuários autenticados do tenant
CREATE POLICY "activity_log_read" ON activity_log
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

-- ------------------------------------------------------------
-- 2. FUNÇÃO GENÉRICA DE LOG
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_tenant_id uuid;
  v_record_id uuid;
  v_old_data  jsonb;
  v_new_data  jsonb;
  v_user_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_record_id := OLD.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_tenant_id := NEW.tenant_id;
    v_record_id := NEW.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := to_jsonb(NEW);
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_record_id := NEW.id;
    v_old_data  := NULL;
    v_new_data  := to_jsonb(NEW);
  END IF;

  -- Captura o nome do usuário no momento da ação
  SELECT full_name INTO v_user_name
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  INSERT INTO activity_log (tenant_id, user_id, user_name, action, table_name, record_id, old_data, new_data)
  VALUES (v_tenant_id, auth.uid(), v_user_name, TG_OP, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$func$;

-- ------------------------------------------------------------
-- 3. TRIGGERS NAS TABELAS PRINCIPAIS
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_log_cutting_orders       ON cutting_orders;
DROP TRIGGER IF EXISTS trg_log_cutting_executions   ON cutting_executions;
DROP TRIGGER IF EXISTS trg_log_faction_dispatches   ON faction_dispatches;
DROP TRIGGER IF EXISTS trg_log_inventory_transactions ON inventory_transactions;
DROP TRIGGER IF EXISTS trg_log_technical_sheets     ON technical_sheets;

CREATE TRIGGER trg_log_cutting_orders
  AFTER INSERT OR UPDATE OR DELETE ON cutting_orders
  FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

CREATE TRIGGER trg_log_cutting_executions
  AFTER INSERT OR UPDATE OR DELETE ON cutting_executions
  FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

CREATE TRIGGER trg_log_faction_dispatches
  AFTER INSERT OR UPDATE OR DELETE ON faction_dispatches
  FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

CREATE TRIGGER trg_log_inventory_transactions
  AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

CREATE TRIGGER trg_log_technical_sheets
  AFTER INSERT OR UPDATE OR DELETE ON technical_sheets
  FOR EACH ROW EXECUTE FUNCTION fn_log_activity();

-- ------------------------------------------------------------
-- 4. COLUNA image_url NAS FICHAS TÉCNICAS
-- ------------------------------------------------------------

ALTER TABLE technical_sheets
  ADD COLUMN IF NOT EXISTS image_url text;

-- ------------------------------------------------------------
-- 5. STORAGE BUCKET: technical-sheets
-- (Execute pelo painel Supabase > Storage > New Bucket,
--  ou descomente e ajuste conforme sua política)
-- ------------------------------------------------------------
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('technical-sheets', 'technical-sheets', true)
-- ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "tenant_upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'technical-sheets' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "public_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'technical-sheets');
--
-- CREATE POLICY "tenant_delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'technical-sheets' AND auth.role() = 'authenticated');
