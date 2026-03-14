-- InboxChat Database Schema
-- Correr este archivo una vez para crear las tablas.
-- En producción, usar un sistema de migraciones (ej: node-pg-migrate).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Workspaces: cuenta del operador
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  api_key     TEXT UNIQUE NOT NULL,  -- key que va en el script tag del cliente
  owner_email TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'pro')),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts: usuarios finales (visitantes de la app del cliente)
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  external_id   TEXT,                  -- userId pasado via identify()
  name          TEXT,
  email         TEXT,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un external_id es único por workspace, pero puede ser null (visitantes anónimos)
  UNIQUE (workspace_id, external_id)
);

-- Conversations: hilo de mensajes entre un contacto y el operador
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  unread_count  INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages: mensajes individuales dentro de una conversación
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 5000),
  sender          TEXT NOT NULL CHECK (sender IN ('contact', 'operator')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_api_key ON workspaces(api_key);

-- Trigger: actualizar updated_at en conversations cuando llega un mensaje
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER messages_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
