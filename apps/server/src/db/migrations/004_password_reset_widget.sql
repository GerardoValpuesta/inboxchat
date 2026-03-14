-- Migración: password reset + widget customization
-- Correr en el SQL Editor de Supabase / Railway

-- 1. Reset token para operadores
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- 2. Widget customization por workspace
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS widget_title TEXT NOT NULL DEFAULT 'Soporte',
  ADD COLUMN IF NOT EXISTS widget_color TEXT NOT NULL DEFAULT '#1e293b';
