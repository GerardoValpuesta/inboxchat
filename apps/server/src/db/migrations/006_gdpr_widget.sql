-- Migración 006: GDPR consent en widget
-- Correr en Supabase SQL Editor

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS widget_gdpr_enabled BOOLEAN NOT NULL DEFAULT false;
