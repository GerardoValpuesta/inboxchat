-- Migration 022 — workspace_events
-- Tabla de eventos de activación y ciclo de vida del workspace.
-- Usada para tracking de: activación, retención y conversión.

CREATE TABLE IF NOT EXISTS workspace_events (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event        TEXT        NOT NULL,
  -- Eventos clave:
  --   widget_installed      → primera conversación desde el widget
  --   first_message_received → primer mensaje de un visitante
  --   first_operator_reply   → primer reply de un operador
  --   conversation_resolved  → conversación cerrada
  --   plan_upgraded          → pago exitoso (Stripe webhook)
  --   promo_redeemed         → código promo canjeado
  properties   JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workspace_events_workspace_id_idx
  ON workspace_events (workspace_id);

CREATE INDEX IF NOT EXISTS workspace_events_event_idx
  ON workspace_events (event);

CREATE INDEX IF NOT EXISTS workspace_events_created_at_idx
  ON workspace_events (created_at DESC);

-- Índice compuesto para las queries más comunes:
-- "¿cuándo fue el primer X para el workspace Y?"
CREATE INDEX IF NOT EXISTS workspace_events_workspace_event_idx
  ON workspace_events (workspace_id, event, created_at);
