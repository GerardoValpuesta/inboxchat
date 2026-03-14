-- Seed: crear un workspace de prueba para desarrollo local.
-- El api_key va en el script tag del widget.
-- Correr una sola vez en el SQL Editor de Supabase.

INSERT INTO workspaces (id, name, api_key, owner_email, plan)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Mi Empresa (dev)',
  'dev_key_inboxchat_local',
  'valpuestagerardo@gmail.com',
  'trial'
)
ON CONFLICT (id) DO NOTHING;

-- Verificar que se insertó
SELECT id, name, api_key, plan FROM workspaces;
