-- ─── voice_calls eksik sütunlar — 31 Temmuz 2026 ────────────────────────────
-- CREATE TABLE IF NOT EXISTS sütun EKLEMİYOR. Bu migration eski tabloya sütunları ekler.

ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS conversation_style TEXT DEFAULT 'consultant';
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS vapi_call_id TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('positive','negative','callback','no_answer','unknown'));
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS cost_cents INTEGER;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS end_reason TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Not: duration_seconds, transcript, notes sütunları zaten mevcut
-- Index ekle (IF NOT EXISTS ile güvenli)
CREATE INDEX IF NOT EXISTS voice_calls_conv_idx ON voice_calls(eleven_conversation_id) WHERE eleven_conversation_id IS NOT NULL;
