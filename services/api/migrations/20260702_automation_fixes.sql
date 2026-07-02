-- ─── OTOMASYON KRİTİK DÜZELTMELERİ ──────────────────────────────────────────
-- 2 Temmuz 2026
-- Race condition kilidi, email tracking, canlı sekans monitörü

-- ─── 1. WORKFLOW RACE CONDITION KİLİDİ ───────────────────────────────────────
ALTER TABLE workflow_enrollments
  ADD COLUMN IF NOT EXISTS processing_since TIMESTAMPTZ;   -- Cron kilidi
CREATE INDEX IF NOT EXISTS we_processing_idx ON workflow_enrollments(processing_since)
  WHERE processing_since IS NOT NULL;

-- ─── 2. SEQUENCE ENROLLMENTS — sonraki adım zamanı ───────────────────────────
ALTER TABLE sequence_enrollments
  ADD COLUMN IF NOT EXISTS next_step_at TIMESTAMPTZ,       -- Canlı monitör için
  ADD COLUMN IF NOT EXISTS error_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error   TEXT;

CREATE INDEX IF NOT EXISTS se_next_step_idx ON sequence_enrollments(next_step_at)
  WHERE status = 'active';

-- ─── 3. EMAIL AÇMA TAKIBI ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id   UUID REFERENCES messages(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL
    CHECK (event_type IN ('email_opened','link_clicked','whatsapp_read','replied')),
  metadata     JSONB DEFAULT '{}',
  occurred_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS me_lead_event_idx ON message_events(lead_id, event_type);
CREATE INDEX IF NOT EXISTS me_user_event_idx ON message_events(user_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS me_message_idx    ON message_events(message_id);

-- ─── 4. CAMPAIGNS — FUNNEL TRACKING ──────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS msg_campaign_idx ON messages(campaign_id) WHERE campaign_id IS NOT NULL;

-- ─── 5. KULLANICI BAŞINA ÖZELLEŞTIRILMIŞ GÜNLÜK LİMİT ────────────────────────
-- voice_settings'e zaten başka alanlar eklendi, campaigns için:
ALTER TABLE voice_settings
  ADD COLUMN IF NOT EXISTS daily_wa_limit   INTEGER DEFAULT 150,  -- WhatsApp günlük max
  ADD COLUMN IF NOT EXISTS daily_email_limit INTEGER DEFAULT 500; -- Email günlük max

-- ─── 6. AUTOMATION WEBHOOK LOG (Dead webhook izleme) ─────────────────────────
CREATE TABLE IF NOT EXISTS webhook_failures (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webhook_url  TEXT NOT NULL,
  fail_count   INTEGER DEFAULT 1,
  last_error   TEXT,
  disabled_at  TIMESTAMPTZ,            -- 3+ hata sonrası devre dışı
  last_failed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, webhook_url)
);
