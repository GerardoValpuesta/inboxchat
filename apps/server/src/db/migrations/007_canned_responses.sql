-- Migration 007: Canned Responses
-- Respuestas predefinidas para acelerar el tiempo de respuesta del operador

CREATE TABLE IF NOT EXISTS canned_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shortcut     TEXT NOT NULL,   -- ej: "hola", "precio", "demo"
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_canned_workspace ON canned_responses(workspace_id);
