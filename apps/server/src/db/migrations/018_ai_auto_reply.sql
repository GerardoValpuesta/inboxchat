-- 018: AI Auto-Reply config
-- Agrega configuración de respuestas automáticas con IA por workspace.
-- Límites por plan: Pro → 500 replies/mes, Growth → 2000/mes.

-- Columnas en workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS ai_enabled          BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_context          TEXT         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_trigger_minutes  INTEGER      NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS ai_tone             TEXT         NOT NULL DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS ai_replies_count    INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_replies_reset_at TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- Para no enviar múltiples replies IA a la misma conversación
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_replied_at TIMESTAMPTZ DEFAULT NULL;

-- Index para el cron (buscar convs donde IA puede actuar)
CREATE INDEX IF NOT EXISTS idx_conversations_ai_replied
  ON conversations (ai_replied_at)
  WHERE ai_replied_at IS NULL AND status = 'open';
