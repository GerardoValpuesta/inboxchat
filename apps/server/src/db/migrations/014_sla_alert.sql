-- 014: Agrega sla_alert_sent_at a conversations
-- El cron de SLA usa esta columna para no re-enviar alertas
-- más de una vez cada 2 horas por la misma conversación.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS sla_alert_sent_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_sla_alert
  ON conversations (sla_alert_sent_at)
  WHERE sla_alert_sent_at IS NOT NULL;
