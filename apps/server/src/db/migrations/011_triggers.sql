-- 011: Proactive message triggers
-- El operador configura triggers que el widget evalúa
-- para enviar mensajes automáticos cuando un visitante entra a cierta URL

CREATE TABLE IF NOT EXISTS triggers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,                       -- nombre interno (ej: "Pricing page pop-up")
  url_pattern  TEXT NOT NULL,                       -- glob/substring (ej: "/pricing", "/checkout")
  delay_secs   INTEGER NOT NULL DEFAULT 10,         -- segundos antes de disparar
  message      TEXT NOT NULL,                       -- mensaje que aparece en el widget
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_workspace ON triggers(workspace_id) WHERE is_active = TRUE;
