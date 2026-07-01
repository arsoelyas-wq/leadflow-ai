-- ─── CALL INTELLIGENCE — arama zekası ve konuşma tarzı öğrenme ──────────────
-- Her arama sonrası Claude transkript analizi burada birikir.
-- Sistem bu veriden: hangi konuşma tarzı hangi sektörde çalışıyor → öğrenir.

CREATE TABLE IF NOT EXISTS call_intelligence (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id            UUID REFERENCES leads(id) ON DELETE SET NULL,
  call_id            UUID REFERENCES voice_calls(id) ON DELETE SET NULL,
  conversation_style TEXT NOT NULL DEFAULT 'consultant'
    CHECK (conversation_style IN ('consultant','challenger','rapport','direct','corporate')),
  duration_sec       INTEGER,
  outcome            TEXT CHECK (outcome IN ('appointment','callback','rejected','no_answer','busy','unknown')),
  sentiment_score    INTEGER CHECK (sentiment_score BETWEEN 1 AND 10),
  interest_score     INTEGER CHECK (interest_score BETWEEN 1 AND 10),
  objections         TEXT[],
  next_action        TEXT,
  transcript_summary TEXT,
  sector             TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ci_user_style_idx ON call_intelligence(user_id, conversation_style);
CREATE INDEX IF NOT EXISTS ci_user_sector_idx ON call_intelligence(user_id, sector);
CREATE INDEX IF NOT EXISTS ci_user_outcome_idx ON call_intelligence(user_id, outcome);
CREATE INDEX IF NOT EXISTS ci_lead_idx ON call_intelligence(lead_id) WHERE lead_id IS NOT NULL;
