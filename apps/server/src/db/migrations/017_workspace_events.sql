-- Migration 017: workspace_events — tracking de activación y métricas clave
-- Ejecutar en Supabase: SQL Editor → Run

CREATE TABLE IF NOT EXISTS workspace_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event        TEXT NOT NULL,           -- 'widget_installed', 'first_message', 'first_reply', 'plan_upgraded', 'csat_submitted'
  properties   JSONB,                   -- datos adicionales del evento (ej: rating, plan anterior)
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para queries de activación y retención
CREATE INDEX IF NOT EXISTS workspace_events_workspace_idx  ON workspace_events(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_events_event_idx      ON workspace_events(event);
CREATE INDEX IF NOT EXISTS workspace_events_created_at_idx ON workspace_events(created_at DESC);

-- Vista de activación por workspace (simplifica las queries del dashboard)
CREATE OR REPLACE VIEW workspace_activation AS
SELECT
  w.id AS workspace_id,
  w.name,
  w.plan,
  w.created_at AS signup_at,
  MAX(CASE WHEN e.event = 'widget_installed'  THEN e.created_at END) AS widget_installed_at,
  MAX(CASE WHEN e.event = 'first_message'     THEN e.created_at END) AS first_message_at,
  MAX(CASE WHEN e.event = 'first_reply'       THEN e.created_at END) AS first_reply_at,
  MAX(CASE WHEN e.event = 'plan_upgraded'     THEN e.created_at END) AS plan_upgraded_at,
  COUNT(DISTINCT cv.id)::int AS total_conversations,
  COUNT(DISTINCT CASE WHEN cv.status = 'closed' THEN cv.id END)::int AS closed_conversations
FROM workspaces w
LEFT JOIN workspace_events e ON e.workspace_id = w.id
LEFT JOIN conversations cv ON cv.workspace_id = w.id
GROUP BY w.id, w.name, w.plan, w.created_at;
