-- Migración: agregar autenticación de operadores
-- Correr en el SQL Editor de Supabase

-- Tabla de operadores (usuarios del dashboard)
CREATE TABLE IF NOT EXISTS operators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'agent')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_operators_workspace ON operators(workspace_id);
CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email);
