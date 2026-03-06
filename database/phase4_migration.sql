-- ============================================================
-- Phase 4 Migration — Métricas Admin + Log de Acesso
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Coluna last_seen_at em profiles
--    Atualizada pelo frontend no login via Supabase Auth SIGNED_IN event.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Índice para ordenação por último acesso
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON profiles (tenant_id, last_seen_at DESC NULLS LAST);
