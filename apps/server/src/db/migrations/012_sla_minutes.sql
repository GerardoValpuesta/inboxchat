-- 012: Agregar columna sla_minutes a workspaces
-- Permite al operador configurar el threshold de alerta SLA
-- (minutos antes de notificar que una conversación no tiene respuesta)

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sla_minutes INTEGER NOT NULL DEFAULT 10;
