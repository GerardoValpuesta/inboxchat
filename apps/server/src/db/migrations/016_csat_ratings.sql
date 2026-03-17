-- 016: CSAT Ratings — almacena la calificación del visitante al hacer click en el email CSAT
CREATE TABLE IF NOT EXISTS csat_ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Solo una calificación por conversación
  CONSTRAINT uq_csat_rating_per_conv UNIQUE (conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_csat_workspace
  ON csat_ratings (workspace_id, created_at DESC);
