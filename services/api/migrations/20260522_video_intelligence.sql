-- ─── Video Intelligence Layer ────────────────────────────────────────────────

-- Watch time tracking per view event
ALTER TABLE video_views
  ADD COLUMN IF NOT EXISTS watch_seconds  INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS watch_percent  INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed      BOOLEAN DEFAULT FALSE;

-- A/B hook testing + analytics on video_outreach
ALTER TABLE video_outreach
  ADD COLUMN IF NOT EXISTS hook_a             TEXT,
  ADD COLUMN IF NOT EXISTS hook_b             TEXT,
  ADD COLUMN IF NOT EXISTS active_hook        TEXT    DEFAULT 'a',
  ADD COLUMN IF NOT EXISTS avg_watch_percent  INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_watch_percent  INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS script_score       INT,
  ADD COLUMN IF NOT EXISTS optimal_send_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS send_time_reason   TEXT,
  ADD COLUMN IF NOT EXISTS tech_stack         JSONB,
  ADD COLUMN IF NOT EXISTS job_signals        JSONB,
  ADD COLUMN IF NOT EXISTS growth_stage       TEXT;

-- Multi-touch outreach sequences
CREATE TABLE IF NOT EXISTS video_sequences (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  video_id         UUID        NOT NULL,
  lead_id          UUID        NOT NULL,
  status           TEXT        DEFAULT 'active',  -- active | completed | opted_out | paused
  trigger_type     TEXT,                          -- sent | no_view | partial | high | completed_view
  steps            JSONB       DEFAULT '[]',
  current_step     INT         DEFAULT 0,
  last_watch_pct   INT         DEFAULT 0,
  research_context JSONB,                         -- cached brandName, pains, phone
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  next_action_at   TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_sequences_next
  ON video_sequences (next_action_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_video_sequences_user
  ON video_sequences (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_sequences_video
  ON video_sequences (video_id);

ALTER TABLE video_sequences ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'video_sequences' AND policyname = 'video_sequences_user_isolation'
  ) THEN
    CREATE POLICY "video_sequences_user_isolation"
      ON video_sequences FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Performance learning log (sector × hook_type → watch outcome)
CREATE TABLE IF NOT EXISTS video_performance_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  video_id         UUID        NOT NULL,
  sector           TEXT,
  country          TEXT,
  research_quality TEXT,
  hook_type        TEXT,       -- 'a' | 'b'
  watch_percent    INT,
  sequence_step_reached INT DEFAULT 0,
  converted        BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_log_user_sector ON video_performance_log (user_id, sector);
