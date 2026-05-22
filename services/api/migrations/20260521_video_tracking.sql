-- Video Outreach: Tracking + Campaign + Settings Infrastructure

-- 1. Extend video_outreach with tracking columns
ALTER TABLE video_outreach
  ADD COLUMN IF NOT EXISTS tracking_code       TEXT,
  ADD COLUMN IF NOT EXISTS view_count          INT         DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_viewed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_viewed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_call_triggered BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS error_message       TEXT;

-- Backfill tracking codes for any existing rows
UPDATE video_outreach
SET tracking_code = encode(gen_random_bytes(10), 'hex')
WHERE tracking_code IS NULL;

-- Unique index on tracking_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_outreach_tracking_code
  ON video_outreach (tracking_code)
  WHERE tracking_code IS NOT NULL;

-- 2. video_views — one row per open event
CREATE TABLE IF NOT EXISTS video_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID        NOT NULL,
  user_id    UUID        NOT NULL,
  lead_id    UUID,
  ip_address TEXT,
  user_agent TEXT,
  referer    TEXT,
  viewed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views (video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user  ON video_views (user_id, viewed_at DESC);

ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'video_views' AND policyname = 'video_views_user_isolation'
  ) THEN
    CREATE POLICY "video_views_user_isolation" ON video_views FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. video_outreach_settings — auto-call + preferences per user
CREATE TABLE IF NOT EXISTS video_outreach_settings (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL UNIQUE,
  auto_call_on_view  BOOLEAN     DEFAULT FALSE,
  call_delay_minutes INT         DEFAULT 5,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_outreach_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'video_outreach_settings' AND policyname = 'vo_settings_user_isolation'
  ) THEN
    CREATE POLICY "vo_settings_user_isolation" ON video_outreach_settings FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- 4. video_campaigns — bulk campaign progress tracking
CREATE TABLE IF NOT EXISTS video_campaigns (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL,
  name           TEXT,
  total_leads    INT         DEFAULT 0,
  videos_created INT         DEFAULT 0,
  videos_sent    INT         DEFAULT 0,
  status         TEXT        DEFAULT 'running',
  avatar_id      TEXT,
  voice_id       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_campaigns_user ON video_campaigns (user_id, created_at DESC);

ALTER TABLE video_campaigns ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'video_campaigns' AND policyname = 'video_campaigns_user_isolation'
  ) THEN
    CREATE POLICY "video_campaigns_user_isolation" ON video_campaigns FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
