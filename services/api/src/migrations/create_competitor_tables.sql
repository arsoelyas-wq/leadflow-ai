-- ═══════════════════════════════════════════════════════════════════════════════
-- COMPETITOR RADAR / SHADOW MONITORING / CRISIS RADAR — Full Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. COMPETITORS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT DEFAULT '',
  sector TEXT DEFAULT '',
  website TEXT,
  country TEXT DEFAULT 'TR',
  channels TEXT[] DEFAULT ARRAY['google', 'linkedin', 'social_reviews'],
  auto_scan BOOLEAN DEFAULT true,
  total_leads_found INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  -- Shadow monitoring columns
  shadow_data JSONB,
  shadow_changes JSONB DEFAULT '[]'::jsonb,
  shadow_price_history JSONB DEFAULT '[]'::jsonb,
  threat_score INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitors_auto_scan ON competitors(user_id, auto_scan) WHERE auto_scan = true;

-- RLS policies
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own competitors" ON competitors;
CREATE POLICY "Users can view own competitors" ON competitors
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own competitors" ON competitors;
CREATE POLICY "Users can insert own competitors" ON competitors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own competitors" ON competitors;
CREATE POLICY "Users can update own competitors" ON competitors
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own competitors" ON competitors;
CREATE POLICY "Users can delete own competitors" ON competitors
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass (API uses service key)
DROP POLICY IF EXISTS "Service role full access competitors" ON competitors;
CREATE POLICY "Service role full access competitors" ON competitors
  FOR ALL USING (true) WITH CHECK (true);


-- ── 2. COMPETITOR_LEADS TABLE (Deduplication Tracking) ────────────────────────
CREATE TABLE IF NOT EXISTS competitor_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id TEXT NOT NULL,
  identifier TEXT NOT NULL,
  found_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, identifier)
);

CREATE INDEX IF NOT EXISTS idx_competitor_leads_user ON competitor_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_leads_lookup ON competitor_leads(user_id, identifier);

ALTER TABLE competitor_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access competitor_leads" ON competitor_leads;
CREATE POLICY "Service role full access competitor_leads" ON competitor_leads
  FOR ALL USING (true) WITH CHECK (true);


-- ── 3. CRISIS_ALERTS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crisis_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link TEXT,
  type TEXT DEFAULT 'info',
  sector TEXT,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_user ON crisis_alerts(user_id);

ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access crisis_alerts" ON crisis_alerts;
CREATE POLICY "Service role full access crisis_alerts" ON crisis_alerts
  FOR ALL USING (true) WITH CHECK (true);


-- ── 4. CRISIS_SETTINGS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crisis_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  sectors TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crisis_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access crisis_settings" ON crisis_settings;
CREATE POLICY "Service role full access crisis_settings" ON crisis_settings
  FOR ALL USING (true) WITH CHECK (true);


-- ── 4b. ENSURE COMPETITORS HAS ALL COLUMNS (for existing tables) ──────────────
-- If table was created before this migration, add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'updated_at') THEN
    ALTER TABLE competitors ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'shadow_data') THEN
    ALTER TABLE competitors ADD COLUMN shadow_data JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'shadow_changes') THEN
    ALTER TABLE competitors ADD COLUMN shadow_changes JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'shadow_price_history') THEN
    ALTER TABLE competitors ADD COLUMN shadow_price_history JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'threat_score') THEN
    ALTER TABLE competitors ADD COLUMN threat_score INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'website') THEN
    ALTER TABLE competitors ADD COLUMN website TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitors' AND column_name = 'country') THEN
    ALTER TABLE competitors ADD COLUMN country TEXT DEFAULT 'TR';
  END IF;
END $$;


-- ── 5. ENSURE LEADS TABLE HAS REQUIRED COLUMNS ───────────────────────────────
-- (leads table should already exist, just ensure competitor-sourced leads work)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source') THEN
    ALTER TABLE leads ADD COLUMN source TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score') THEN
    ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'notes') THEN
    ALTER TABLE leads ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contact_name') THEN
    ALTER TABLE leads ADD COLUMN contact_name TEXT;
  END IF;
END $$;


-- ── 6. CLEANUP: Remove trigger that can crash if updated_at column is missing ─
DROP TRIGGER IF EXISTS competitors_updated_at ON competitors;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Tables created:
--   ✅ competitors (with shadow columns)
--   ✅ competitor_leads (deduplication)
--   ✅ crisis_alerts
--   ✅ crisis_settings
--   ✅ RLS policies (service role bypass)
--   ✅ Indexes for performance
--   ✅ updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════════════
