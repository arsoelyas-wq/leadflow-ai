-- ── Audit Log — admin ve kritik kullanıcı işlemleri ─────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email   TEXT,
  user_id       TEXT,
  action        TEXT NOT NULL,   -- 'auth.login' | 'user.ban' | 'plan.change' | etc.
  target_user_id TEXT,
  details       JSONB DEFAULT '{}',
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aal_email  ON admin_audit_logs(admin_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_action ON admin_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_uid    ON admin_audit_logs(target_user_id);

-- ── Security Events — anomali, şüpheli istek, honeypot ───────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,  -- 'brute_force' | 'anomaly' | 'honeypot' | 'rate_limit_exceeded'
  ip_address  TEXT,
  user_id     TEXT,
  path        TEXT,
  details     JSONB DEFAULT '{}',
  severity    TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_se_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_se_ip   ON security_events(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_se_sev  ON security_events(severity, created_at DESC);

-- ── Token Blocklist — logout ve revocation ────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_blocklist (
  jti        TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  reason     TEXT DEFAULT 'logout',
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tb_user ON token_blocklist(user_id);
CREATE INDEX IF NOT EXISTS idx_tb_exp  ON token_blocklist(expires_at);

-- tokens_revoked_at column on users (for revoke-all sessions)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_revoked_at TIMESTAMPTZ;
