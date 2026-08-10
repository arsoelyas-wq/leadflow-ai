-- Task 5 (Hot Lead Radar) + Task 6 (Lead Scoring) AI columns
-- Run in Supabase SQL Editor

ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_hot BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hot_until TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_opening_message TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_quality_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_quality_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMPTZ;
