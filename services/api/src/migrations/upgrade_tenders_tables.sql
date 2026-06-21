-- ═══════════════════════════════════════════════════════════════════════════════
-- TENDER HUNTER UPGRADE — New columns for AI Coach, Pipeline, Win Probability
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. ADD NEW COLUMNS TO TENDERS TABLE ──────────────────────────────────────
DO $$
BEGIN
  -- Pipeline tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'pipeline_step') THEN
    ALTER TABLE tenders ADD COLUMN pipeline_step TEXT DEFAULT 'discovered';
  END IF;

  -- AI Coach fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'win_probability') THEN
    ALTER TABLE tenders ADD COLUMN win_probability INTEGER DEFAULT 50;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'action_steps') THEN
    ALTER TABLE tenders ADD COLUMN action_steps JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'missing_docs') THEN
    ALTER TABLE tenders ADD COLUMN missing_docs JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'competitor_insight') THEN
    ALTER TABLE tenders ADD COLUMN competitor_insight TEXT;
  END IF;

  -- Existing columns that may be missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'match_reason') THEN
    ALTER TABLE tenders ADD COLUMN match_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'risk_level') THEN
    ALTER TABLE tenders ADD COLUMN risk_level TEXT DEFAULT 'Orta';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'sector') THEN
    ALTER TABLE tenders ADD COLUMN sector TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'updated_at') THEN
    ALTER TABLE tenders ADD COLUMN updated_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'applied_at') THEN
    ALTER TABLE tenders ADD COLUMN applied_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenders' AND column_name = 'result') THEN
    ALTER TABLE tenders ADD COLUMN result TEXT;
  END IF;
END $$;

-- ── 2. INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenders_user_score ON tenders(user_id, ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_user_status ON tenders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tenders_deadline ON tenders(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenders_pipeline ON tenders(user_id, pipeline_step);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! New columns added:
--   pipeline_step, win_probability, action_steps, missing_docs,
--   competitor_insight, match_reason, risk_level, sector, updated_at
-- ═══════════════════════════════════════════════════════════════════════════════
