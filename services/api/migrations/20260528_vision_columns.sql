-- Vision AI analysis columns on leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS vision_analysis      TEXT,
  ADD COLUMN IF NOT EXISTS vision_analyzed_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_vision_analyzed_at ON leads (vision_analyzed_at);
