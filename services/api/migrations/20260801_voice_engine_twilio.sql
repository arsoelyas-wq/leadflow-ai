-- ─── LeadFlow Voice Engine — Twilio kolonları (1 Ağustos 2026) ──────────────────
-- Önce: 20260731_voice_calls_missing_columns.sql çalıştırılmış olmalı
-- Bu dosya Twilio tabanlı engine için ek kolonlar ekler

-- twilio_call_sid — Twilio'nun CA... formatındaki çağrı kimliği
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT;

-- conversation_style — Vapi döneminden kalan stil alanı
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS conversation_style TEXT DEFAULT 'consultant';

-- vapi_call_id — geriye uyumluluk (eski aramalarda dolu, yenilerde boş)
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS vapi_call_id TEXT;

-- outcome — arama sonucu
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS outcome TEXT
  CHECK (outcome IN ('positive','negative','callback','no_answer','unknown'));

-- analysis — AI sonrası JSON analiz (toplantı, itiraz vb.)
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS analysis JSONB;

-- cost_cents — arama maliyeti (sent cinsinden)
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS cost_cents INTEGER;

-- end_reason — neden bitti (appointment_booked, silence_timeout, end_phrase vb.)
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- recording_url — Twilio kayıt URL'i
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- ended_at — aramanın bitiş zamanı
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- ─── İndeksler ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS voice_calls_twilio_sid_idx
  ON voice_calls(twilio_call_sid)
  WHERE twilio_call_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS voice_calls_conv_idx
  ON voice_calls(eleven_conversation_id)
  WHERE eleven_conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS voice_calls_outcome_idx
  ON voice_calls(user_id, outcome)
  WHERE outcome IS NOT NULL;

-- ─── Supabase Realtime (UI polling için) ────────────────────────────────────────
-- voice_calls tablosunun realtime yayınına emin ol
-- (Supabase Dashboard > Table Editor > voice_calls > Realtime toggle ON)
