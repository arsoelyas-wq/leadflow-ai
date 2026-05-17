-- ============================================================
-- LeadFlow AI — Lead Features Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Lead Activity Events
CREATE TABLE IF NOT EXISTS lead_activities (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id      UUID        NOT NULL,
  user_id      UUID        NOT NULL,
  event_type   TEXT        NOT NULL,
  -- event_type values:
  --   email_open | email_click | site_visit
  --   whatsapp_reply | call_made | call_missed
  --   status_change | score_change | note_added | dm_found
  --   enriched
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_la_lead      ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_la_user      ON lead_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_la_type      ON lead_activities(event_type);
CREATE INDEX IF NOT EXISTS idx_la_created   ON lead_activities(created_at DESC);

-- 2. Lead Network Connections (Referral Graph)
CREATE TABLE IF NOT EXISTS lead_connections (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL,
  lead_id        UUID        NOT NULL,
  connected_to   UUID        NOT NULL,
  connection_type TEXT       DEFAULT 'referral',
  -- types: referral | knows | same_network | customer_ref
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lead_id, connected_to)
);

CREATE INDEX IF NOT EXISTS idx_lc_lead ON lead_connections(lead_id);
CREATE INDEX IF NOT EXISTS idx_lc_user ON lead_connections(user_id);

-- 3. Extra columns on leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hot_score          INTEGER     DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at   TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_at        TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_status  TEXT        DEFAULT 'pending';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary         TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_size       TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue_estimate   TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS best_contact_hour  INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pixel_token        TEXT        UNIQUE;

-- 4. Enable Row Level Security (if not already)
ALTER TABLE lead_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_connections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY IF NOT EXISTS "users_own_activities"
  ON lead_activities FOR ALL USING (user_id = auth.uid()::UUID);

CREATE POLICY IF NOT EXISTS "users_own_connections"
  ON lead_connections FOR ALL USING (user_id = auth.uid()::UUID);
