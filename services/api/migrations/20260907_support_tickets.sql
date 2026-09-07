-- Support Tickets: formal ticket system with attachments, admin reply, status tracking
CREATE TABLE IF NOT EXISTS support_tickets (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number     SERIAL      UNIQUE,
  user_id           UUID        NOT NULL,
  user_email        TEXT,
  user_name         TEXT,
  conversation_id   UUID,                    -- optional link to AI chat conversation
  category          TEXT        NOT NULL DEFAULT 'general',  -- technical, billing, feature, account, general
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  priority          TEXT        DEFAULT 'normal',            -- low, normal, high, urgent
  status            TEXT        DEFAULT 'open',              -- open, in_progress, waiting, resolved, closed
  attachments       JSONB       DEFAULT '[]',                -- [{name, dataUrl, type}]
  admin_reply       TEXT,
  admin_name        TEXT,
  admin_replied_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user   ON support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);

CREATE OR REPLACE FUNCTION update_support_tickets_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_tickets_ts ON support_tickets;
CREATE TRIGGER support_tickets_ts
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_tickets_ts();

-- RLS: users only see their own tickets; admins use service key (bypasses RLS)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_select_own_tickets" ON support_tickets;
CREATE POLICY "user_select_own_tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_insert_own_tickets" ON support_tickets;
CREATE POLICY "user_insert_own_tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
