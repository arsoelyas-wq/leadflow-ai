-- ─── VOICE CALLS + CAMPAIGNS — temel arama altyapısı ────────────────────────
-- Bu tablolar olmadan tüm sesli arama sistemi kayıt tutmuyor.
-- 2 Temmuz 2026 — kritik eksik migration.

-- ─── VOICE CAMPAIGNS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_campaigns (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  total_leads     INTEGER DEFAULT 0,
  calls_made      INTEGER DEFAULT 0,
  calls_answered  INTEGER DEFAULT 0,
  calls_positive  INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','paused','completed','failed')),
  caller_number   TEXT,
  delay_minutes   INTEGER DEFAULT 5,
  conversation_style TEXT DEFAULT 'consultant',
  language        TEXT DEFAULT 'tr',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS voice_campaigns_user_idx ON voice_campaigns(user_id);
CREATE INDEX IF NOT EXISTS voice_campaigns_status_idx ON voice_campaigns(status) WHERE status != 'completed';

-- ─── VOICE CALLS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_calls (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id                  UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id              UUID REFERENCES voice_campaigns(id) ON DELETE SET NULL,

  -- Provider tracking
  eleven_conversation_id   TEXT,           -- ElevenLabs conversation ID
  twilio_call_sid          TEXT,           -- Twilio call SID
  vapi_call_id             TEXT,           -- Vapi call ID

  -- Call details
  callee_number            TEXT NOT NULL,
  caller_number            TEXT,
  status                   TEXT NOT NULL DEFAULT 'initiating'
    CHECK (status IN ('initiating','calling','completed','failed','no-answer','busy')),
  language                 TEXT DEFAULT 'tr',
  conversation_style       TEXT DEFAULT 'consultant',

  -- Content
  transcript               TEXT,
  duration_seconds         INTEGER,
  recording_url            TEXT,
  end_reason               TEXT,

  -- Analysis (Claude post-call)
  outcome                  TEXT CHECK (outcome IN ('positive','negative','callback','no_answer','unknown')),
  analysis                 JSONB,          -- Full Claude analysis object
  cost_cents               INTEGER,

  -- Metadata
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  ended_at                 TIMESTAMPTZ
);

-- İndeksler
CREATE INDEX IF NOT EXISTS voice_calls_user_idx     ON voice_calls(user_id);
CREATE INDEX IF NOT EXISTS voice_calls_lead_idx     ON voice_calls(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS voice_calls_campaign_idx ON voice_calls(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS voice_calls_conv_idx     ON voice_calls(eleven_conversation_id) WHERE eleven_conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS voice_calls_status_idx   ON voice_calls(status);
CREATE INDEX IF NOT EXISTS voice_calls_created_idx  ON voice_calls(created_at DESC);

-- ─── CALL BLACKLIST — "bir daha aramayın" ────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_blacklist (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone        TEXT NOT NULL,
  reason       TEXT,           -- 'user_request' | 'do_not_call' | 'invalid_number'
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

CREATE INDEX IF NOT EXISTS blacklist_user_phone_idx ON call_blacklist(user_id, phone);

-- ─── CAMPAIGN QUEUE — process restart'a dayanıklı iş kuyruğu ─────────────────
CREATE TABLE IF NOT EXISTS campaign_queue (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     UUID NOT NULL REFERENCES voice_campaigns(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed','skipped')),
  scheduled_at    TIMESTAMPTZ NOT NULL,     -- When to make this call
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  attempt_count   INTEGER DEFAULT 0,
  last_error      TEXT,
  call_id         UUID REFERENCES voice_calls(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cq_status_scheduled_idx ON campaign_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS cq_campaign_idx         ON campaign_queue(campaign_id);
CREATE INDEX IF NOT EXISTS cq_user_idx             ON campaign_queue(user_id);

-- ─── A/B TEST TRACKING ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_name       TEXT NOT NULL,            -- e.g. 'style_ab_2026_07'
  variant         TEXT NOT NULL,            -- conversation style used
  call_id         UUID REFERENCES voice_calls(id) ON DELETE SET NULL,
  outcome         TEXT,                     -- filled by webhook
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ab_user_test_idx ON ab_test_assignments(user_id, test_name);
