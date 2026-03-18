-- 021_promo_codes.sql
-- Códigos de acceso que activan plan Pro por un período de tiempo determinado

CREATE TABLE IF NOT EXISTS promo_codes (
  code          TEXT PRIMARY KEY,
  duration_days INT NOT NULL DEFAULT 30,
  max_uses      INT NOT NULL DEFAULT 1,
  used_count    INT NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ,                -- cuándo el código mismo deja de ser válido (NULL = sin expiración)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code          TEXT NOT NULL REFERENCES promo_codes(code),
  activated_at  TIMESTAMPTZ DEFAULT NOW(),
  pro_until     TIMESTAMPTZ NOT NULL,       -- hasta cuándo dura el Pro por este código
  UNIQUE(workspace_id, code)               -- cada workspace solo puede canjear un código una vez
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_workspace ON promo_redemptions(workspace_id);

-- Ejemplos de uso (ejecutar manualmente en Supabase):
-- INSERT INTO promo_codes (code, duration_days, max_uses) VALUES ('LAUNCH30', 30, 100);
-- INSERT INTO promo_codes (code, duration_days, max_uses) VALUES ('BETA90', 90, 50);
-- INSERT INTO promo_codes (code, duration_days, max_uses, expires_at) VALUES ('PROMO7D', 7, 999, NOW() + INTERVAL '7 days');
