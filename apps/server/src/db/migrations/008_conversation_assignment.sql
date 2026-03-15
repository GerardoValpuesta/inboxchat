-- Migration 008: Conversation Assignment
-- Permite asignar una conversación a un operador específico

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES operators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
