-- 013: Widget analytics events table
-- Registra dos eventos: 'widget_view' (widget cargado en la página del visitante)
-- y 'chat_open' (visitante abrió el chat)
-- Índices optimizados para las queries de analytics (aggregaciones diarias)

CREATE TABLE IF NOT EXISTS widget_events (
  id         BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('widget_view', 'chat_open')),
  session_id TEXT,         -- ID de sesión del visitante (para dedup)
  url        TEXT,         -- URL de la página donde ocurrió el evento
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widget_events_workspace_created
  ON widget_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_widget_events_type
  ON widget_events (workspace_id, event_type, created_at DESC);
