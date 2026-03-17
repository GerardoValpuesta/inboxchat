-- ============================================================
-- 020: Tablas webhooks y tags
-- ============================================================
-- Estas tablas son referenciadas en el sidebar de settings.
-- webhooks: CRUD de endpoints salientes con HMAC-SHA256
-- tags: etiquetas de conversaciones (multi-workspace)
-- ============================================================

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

-- Relación conversación ↔ tags (N:M)
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

-- Webhooks salientes
CREATE TABLE IF NOT EXISTS webhooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  secret       TEXT NOT NULL,
  events       TEXT[] NOT NULL DEFAULT '{}',
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tags_workspace     ON tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conv_tags_conv     ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_tags_tag      ON conversation_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON webhooks(workspace_id);

-- RLS para las nuevas tablas (si ya corriste 019_rls.sql)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tags' AND schemaname = 'public') THEN
    ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "backend_all_tags" ON tags;
    CREATE POLICY "backend_all_tags" ON tags
      FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'conversation_tags' AND schemaname = 'public') THEN
    ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "backend_all_conv_tags" ON conversation_tags;
    CREATE POLICY "backend_all_conv_tags" ON conversation_tags
      FOR ALL TO postgres USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'webhooks' AND schemaname = 'public') THEN
    ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "backend_all_webhooks" ON webhooks;
    CREATE POLICY "backend_all_webhooks" ON webhooks
      FOR ALL TO postgres USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "anon_deny_webhooks" ON webhooks;
    CREATE POLICY "anon_deny_webhooks" ON webhooks
      AS RESTRICTIVE FOR ALL TO anon USING (false);
  END IF;
END $$;

-- Verificar
SELECT tablename, rowsecurity AS rls FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tags', 'conversation_tags', 'webhooks')
ORDER BY tablename;
