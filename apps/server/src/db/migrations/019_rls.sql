-- ============================================================
-- 019: Row Level Security (RLS) — InboxChat
-- ============================================================
-- IMPORTANTE: Este script asume que el backend usa el rol
-- "postgres" (service_role) o un rol con BYPASSRLS.
-- El service_role de Supabase ignora RLS por diseño.
--
-- Propósito:
--   1. Bloquear acceso directo via anon key a tablas sensibles
--   2. Aislar workspaces: aunque el backend siempre filtra
--      por workspace_id, RLS agrega una capa extra.
--
-- Estrategia:
--   - ENABLE RLS en todas las tablas sensibles
--   - Policy PERMISSIVE para el rol "postgres" (backend)
--   - Policy RESTRICTIVE para el rol "anon" (bloqueo total)
-- ============================================================

-- 1. Habilitar RLS en tablas sensibles
ALTER TABLE workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Tablas opcionales: habilitar solo si existen
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tags' AND schemaname = 'public') THEN
    ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'conversation_tags' AND schemaname = 'public') THEN
    ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'webhooks' AND schemaname = 'public') THEN
    ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'csat_ratings' AND schemaname = 'public') THEN
    ALTER TABLE csat_ratings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workspace_events' AND schemaname = 'public') THEN
    ALTER TABLE workspace_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================
-- 2. Políticas para el rol "postgres" (service_role del backend)
-- Permite TODO al backend (BYPASSRLS ya hace esto, pero
-- las policies explícitas mejoran la auditoría).
-- ============================================================

-- workspaces
DROP POLICY IF EXISTS "backend_all_workspaces" ON workspaces;
CREATE POLICY "backend_all_workspaces" ON workspaces
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- operators
DROP POLICY IF EXISTS "backend_all_operators" ON operators;
CREATE POLICY "backend_all_operators" ON operators
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- conversations
DROP POLICY IF EXISTS "backend_all_conversations" ON conversations;
CREATE POLICY "backend_all_conversations" ON conversations
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- messages
DROP POLICY IF EXISTS "backend_all_messages" ON messages;
CREATE POLICY "backend_all_messages" ON messages
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- contacts
DROP POLICY IF EXISTS "backend_all_contacts" ON contacts;
CREATE POLICY "backend_all_contacts" ON contacts
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- canned_responses
DROP POLICY IF EXISTS "backend_all_canned" ON canned_responses;
CREATE POLICY "backend_all_canned" ON canned_responses
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- tags
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tags' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "backend_all_tags" ON tags;
    CREATE POLICY "backend_all_tags" ON tags
      FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;
END $$;

-- conversation_tags
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'conversation_tags' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "backend_all_conv_tags" ON conversation_tags;
    CREATE POLICY "backend_all_conv_tags" ON conversation_tags
      FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;
END $$;

-- webhooks
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'webhooks' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "backend_all_webhooks" ON webhooks;
    CREATE POLICY "backend_all_webhooks" ON webhooks
      FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 3. Políticas RESTRICTIVAS para anon — DENY ALL
-- Bloquea acceso directo via Supabase anon key a datos sensibles.
-- ============================================================

-- workspaces — anon NUNCA puede leer
DROP POLICY IF EXISTS "anon_deny_workspaces" ON workspaces;
CREATE POLICY "anon_deny_workspaces" ON workspaces
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- operators — anon NUNCA puede leer
DROP POLICY IF EXISTS "anon_deny_operators" ON operators;
CREATE POLICY "anon_deny_operators" ON operators
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- conversations — anon NUNCA
DROP POLICY IF EXISTS "anon_deny_conversations" ON conversations;
CREATE POLICY "anon_deny_conversations" ON conversations
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- messages — anon NUNCA
DROP POLICY IF EXISTS "anon_deny_messages" ON messages;
CREATE POLICY "anon_deny_messages" ON messages
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- contacts — anon NUNCA
DROP POLICY IF EXISTS "anon_deny_contacts" ON contacts;
CREATE POLICY "anon_deny_contacts" ON contacts
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- canned_responses — anon NUNCA
DROP POLICY IF EXISTS "anon_deny_canned" ON canned_responses;
CREATE POLICY "anon_deny_canned" ON canned_responses
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- webhooks — anon NUNCA
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'webhooks' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "anon_deny_webhooks" ON webhooks;
    CREATE POLICY "anon_deny_webhooks" ON webhooks
      AS RESTRICTIVE FOR ALL TO anon USING (false);
  END IF;
END $$;

-- ============================================================
-- 4. Verificar que RLS está activo
-- ============================================================
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'workspaces','operators','conversations',
    'messages','contacts','canned_responses',
    'tags','webhooks'
  )
ORDER BY tablename;

-- ============================================================
-- NOTA DE ARQUITECTURA:
-- Este app usa el backend (Node.js) como única capa de acceso
-- a la DB. El backend autentica via JWT y filtra por workspace_id
-- en CADA query. RLS agrega una capa de defensa extra pero NO
-- reemplaza el filtrado a nivel aplicación.
--
-- Para el futuro: si agregás conexiones directas desde el cliente
-- (ej: Supabase JS SDK en el frontend), necesitarás policies
-- basadas en auth.uid() y JWT claims. No hacerlo hoy es apropiado.
-- ============================================================
