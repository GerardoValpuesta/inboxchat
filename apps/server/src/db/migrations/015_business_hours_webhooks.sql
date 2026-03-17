-- 015: Business hours (horarios de atención)
-- Campos JSON para cada día de la semana + timezone del workspace.
-- El widget lee esto para mostrar el estado online/offline automáticamente.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'America/Mexico_City';

-- Estructura esperada de business_hours:
-- {
--   "enabled": true,
--   "days": {
--     "mon": { "open": "09:00", "close": "18:00", "enabled": true },
--     "tue": { "open": "09:00", "close": "18:00", "enabled": true },
--     "wed": { "open": "09:00", "close": "18:00", "enabled": true },
--     "thu": { "open": "09:00", "close": "18:00", "enabled": true },
--     "fri": { "open": "09:00", "close": "18:00", "enabled": true },
--     "sat": { "open": "10:00", "close": "14:00", "enabled": false },
--     "sun": { "open": "10:00", "close": "14:00", "enabled": false }
--   },
--   "offHoursMessage": "Estamos fuera de horario. Te responderemos el próximo día hábil."
-- }

-- 016: Webhooks salientes
-- Un workspace puede registrar múltiples webhooks salientes.
-- Eventos soportados: message.created (por ahora)

CREATE TABLE IF NOT EXISTS outgoing_webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  secret      TEXT DEFAULT NULL,   -- para HMAC-SHA256 signature (X-InboxChat-Signature)
  events      TEXT[] NOT NULL DEFAULT '{message.created}',
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_workspace
  ON outgoing_webhooks (workspace_id)
  WHERE enabled = TRUE;
