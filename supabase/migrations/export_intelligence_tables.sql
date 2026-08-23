-- İhracat Zekası (Export Intelligence) tables
-- Run once in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS export_search_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  country_code TEXT,
  sector TEXT,
  status TEXT DEFAULT 'pending',
  step TEXT,
  progress INTEGER DEFAULT 0,
  result JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE export_search_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_export_s" ON export_search_sessions;
CREATE POLICY "user_own_export_s" ON export_search_sessions USING (true);

CREATE TABLE IF NOT EXISTS export_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  country_code TEXT,
  channel TEXT DEFAULT 'whatsapp',
  subject TEXT,
  body TEXT NOT NULL,
  language TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE export_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_export_m" ON export_messages;
CREATE POLICY "user_own_export_m" ON export_messages USING (true);
CREATE UNIQUE INDEX IF NOT EXISTS export_messages_unique_idx ON export_messages(user_id, lead_id, channel);

CREATE TABLE IF NOT EXISTS export_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  country_code TEXT,
  country_name TEXT,
  channel TEXT DEFAULT 'whatsapp',
  campaign_type TEXT DEFAULT 'outreach',
  lead_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  lead_ids JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  language TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE export_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_export_c" ON export_campaigns;
CREATE POLICY "user_own_export_c" ON export_campaigns USING (true);

-- Extended columns for leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hs_codes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_importer BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_title TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_linkedin TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_score INTEGER DEFAULT 0;
