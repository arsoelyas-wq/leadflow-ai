-- ═══════════════════════════════════════════════════════════════════════════════
-- LEAD HUNTER 7/24 — Database Setup
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Hunter configs
CREATE TABLE IF NOT EXISTS lead_hunter_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords JSONB DEFAULT '[]'::jsonb,
  cities JSONB DEFAULT '["Istanbul"]'::jsonb,
  sources JSONB DEFAULT '["google_maps"]'::jsonb,
  active BOOLEAN DEFAULT true,
  run_interval_hours INTEGER DEFAULT 6,
  max_leads_per_run INTEGER DEFAULT 50,
  auto_start_workflow BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hunter_configs_user ON lead_hunter_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_hunter_configs_active ON lead_hunter_configs(active) WHERE active = true;

ALTER TABLE lead_hunter_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access lead_hunter_configs" ON lead_hunter_configs;
CREATE POLICY "Service role full access lead_hunter_configs" ON lead_hunter_configs FOR ALL USING (true) WITH CHECK (true);

-- 2. Hunter logs (upgraded with source breakdown)
CREATE TABLE IF NOT EXISTS lead_hunter_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID,
  ran_at TIMESTAMPTZ DEFAULT now(),
  leads_found INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  sources JSONB DEFAULT '{}'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hunter_logs_user ON lead_hunter_logs(user_id);

ALTER TABLE lead_hunter_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access lead_hunter_logs" ON lead_hunter_logs;
CREATE POLICY "Service role full access lead_hunter_logs" ON lead_hunter_logs FOR ALL USING (true) WITH CHECK (true);

-- 3. Ensure leads table has hunter columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'auto_hunted') THEN
    ALTER TABLE leads ADD COLUMN auto_hunted BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'hunted_at') THEN
    ALTER TABLE leads ADD COLUMN hunted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'instagram') THEN
    ALTER TABLE leads ADD COLUMN instagram TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'facebook') THEN
    ALTER TABLE leads ADD COLUMN facebook TEXT;
  END IF;
END $$;

-- 4. Add missing log columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_hunter_logs' AND column_name = 'skipped') THEN
    ALTER TABLE lead_hunter_logs ADD COLUMN skipped INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_hunter_logs' AND column_name = 'sources') THEN
    ALTER TABLE lead_hunter_logs ADD COLUMN sources JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_hunter_logs' AND column_name = 'errors') THEN
    ALTER TABLE lead_hunter_logs ADD COLUMN errors JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════════════════════
