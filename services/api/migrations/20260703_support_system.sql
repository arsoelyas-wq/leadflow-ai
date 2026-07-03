-- Support Chat System
-- Created: 2026-07-03

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_email TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
  category TEXT,
  title TEXT,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  quick_replies JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sc_user ON support_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_conv ON support_messages(conversation_id, created_at ASC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_support_conv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_updated_at ON support_conversations;
CREATE TRIGGER trg_sc_updated_at
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW EXECUTE FUNCTION update_support_conv_updated_at();
