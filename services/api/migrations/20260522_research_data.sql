-- Lead research cache: web research results per video
ALTER TABLE video_outreach
  ADD COLUMN IF NOT EXISTS research_data JSONB,
  ADD COLUMN IF NOT EXISTS research_quality TEXT; -- 'web_search' | 'website' | 'sector'
