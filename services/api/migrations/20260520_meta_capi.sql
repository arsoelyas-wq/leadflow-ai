-- Meta CAPI + Attribution System
-- Adds: UTM/fbc columns on leads, CAPI settings on user_settings, event log table

-- 1. Lead attribution columns
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS utm_source    TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium    TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign  TEXT,
  ADD COLUMN IF NOT EXISTS utm_content   TEXT,
  ADD COLUMN IF NOT EXISTS utm_term      TEXT,
  ADD COLUMN IF NOT EXISTS fbc           TEXT,
  ADD COLUMN IF NOT EXISTS fbp           TEXT,
  ADD COLUMN IF NOT EXISTS deal_value    NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS won_at        TIMESTAMPTZ;

-- Index for attribution queries
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON leads (user_id, utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_utm_source   ON leads (user_id, utm_source)   WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_won_at        ON leads (user_id, won_at)       WHERE won_at IS NOT NULL;

-- 2. Meta CAPI settings on user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS meta_pixel_id      TEXT,
  ADD COLUMN IF NOT EXISTS meta_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS meta_test_code     TEXT,
  ADD COLUMN IF NOT EXISTS meta_capi_enabled  BOOLEAN DEFAULT FALSE;

-- 3. CAPI event log table
CREATE TABLE IF NOT EXISTS meta_capi_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  lead_id     TEXT,
  event_name  TEXT        NOT NULL,
  success     BOOLEAN     NOT NULL DEFAULT FALSE,
  response    TEXT,
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_capi_events_user    ON meta_capi_events (user_id, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_capi_events_lead    ON meta_capi_events (lead_id)    WHERE lead_id IS NOT NULL;

-- RLS
ALTER TABLE meta_capi_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meta_capi_events'
      AND policyname = 'meta_capi_events_user_isolation'
  ) THEN
    CREATE POLICY "meta_capi_events_user_isolation"
      ON meta_capi_events
      FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;
