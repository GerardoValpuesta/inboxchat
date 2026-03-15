-- Migration 009: Full-Text Search Indexes
-- Permite buscar conversaciones por nombre/email del contacto o contenido de mensajes

-- Index de full-text search en el body de los mensajes (español)
CREATE INDEX IF NOT EXISTS idx_messages_fts
  ON messages USING gin(to_tsvector('spanish', body));

-- Index en contactos para búsqueda rápida por nombre y email
CREATE INDEX IF NOT EXISTS idx_contacts_name_lower
  ON contacts(workspace_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_contacts_email_lower
  ON contacts(workspace_id, lower(email));
