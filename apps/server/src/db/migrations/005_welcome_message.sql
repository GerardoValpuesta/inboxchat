-- Migración 005: mensaje de bienvenida del widget
-- Correr en el SQL Editor de Supabase

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS widget_welcome_message TEXT NOT NULL DEFAULT '¡Hola! 👋 ¿En qué podemos ayudarte?';
