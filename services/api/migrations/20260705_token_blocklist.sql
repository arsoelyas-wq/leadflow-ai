-- JWT Token Blocklist — logout, password change, account ban
CREATE TABLE IF NOT EXISTS token_blocklist (
  jti       TEXT PRIMARY KEY,           -- JWT ID (unique per token)
  user_id   TEXT NOT NULL,
  reason    TEXT DEFAULT 'logout',      -- 'logout' | 'revoked' | 'banned' | 'password_change'
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL       -- auto-cleanup: same as token expiry
);

CREATE INDEX IF NOT EXISTS idx_tb_user  ON token_blocklist(user_id);
CREATE INDEX IF NOT EXISTS idx_tb_exp   ON token_blocklist(expires_at);

-- Auto-delete expired entries (Supabase doesn't have native TTL, use a daily cleanup)
-- Run: DELETE FROM token_blocklist WHERE expires_at < NOW();
