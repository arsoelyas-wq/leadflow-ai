-- Google Enhanced Conversions System
-- Adds: gclid column on leads, Google CAPI settings on user_settings, event log table

-- 1. gclid column on leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS gclid TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_gclid ON leads (user_id, gclid) WHERE gclid IS NOT NULL;

-- 2. Google CAPI settings on user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS google_customer_id          TEXT,
  ADD COLUMN IF NOT EXISTS google_conversion_action_id TEXT,
  ADD COLUMN IF NOT EXISTS google_capi_enabled         BOOLEAN DEFAULT FALSE;

-- 3. Google CAPI event log table
CREATE TABLE IF NOT EXISTS google_capi_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  lead_id     TEXT,
  event_name  TEXT        NOT NULL,
  success     BOOLEAN     NOT NULL DEFAULT FALSE,
  response    TEXT,
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_capi_events_user ON google_capi_events (user_id, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_capi_events_lead ON google_capi_events (lead_id) WHERE lead_id IS NOT NULL;

-- RLS
ALTER TABLE google_capi_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'google_capi_events'
      AND policyname = 'google_capi_events_user_isolation'
  ) THEN
    CREATE POLICY "google_capi_events_user_isolation"
      ON google_capi_events
      FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;
