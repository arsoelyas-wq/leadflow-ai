-- AI Cost Logs — gerçek API maliyet takibi
-- Supabase SQL Editor'da çalıştırın: https://supabase.com/dashboard/project/sivrmewtljftzlwmppub/sql/new

CREATE TABLE IF NOT EXISTS ai_cost_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,                          -- NULL = system call
  service       TEXT NOT NULL,                 -- 'anthropic' | 'elevenlabs' | 'google_places' | 'perplexity' | 'stripe' | 'resend'
  feature       TEXT NOT NULL,                 -- 'ai_chat' | 'ai_agent' | 'competitor' | 'lead_scrape' | 'voice_call' | 'video_gen' | 'email_send'
  model         TEXT,                          -- 'claude-sonnet-4-20250514' | 'eleven_multilingual_v2' | etc.
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  units         NUMERIC(10,4) DEFAULT 0,       -- generic unit (tokens, minutes, requests, chars)
  unit_type     TEXT DEFAULT 'tokens',         -- 'tokens' | 'minutes' | 'requests' | 'characters' | 'emails'
  cost_usd      NUMERIC(10,6) DEFAULT 0,       -- actual USD cost
  success       BOOLEAN DEFAULT true,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_user    ON ai_cost_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_service ON ai_cost_logs (service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_date    ON ai_cost_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_feature ON ai_cost_logs (feature, created_at DESC);

-- Daily aggregation view
CREATE OR REPLACE VIEW ai_cost_daily AS
SELECT
  DATE(created_at) AS day,
  service,
  feature,
  COUNT(*)                    AS call_count,
  SUM(input_tokens)           AS total_input_tokens,
  SUM(output_tokens)          AS total_output_tokens,
  SUM(units)                  AS total_units,
  SUM(cost_usd)               AS total_cost_usd,
  COUNT(DISTINCT user_id)     AS unique_users
FROM ai_cost_logs
GROUP BY DATE(created_at), service, feature;

-- Per-user total view
CREATE OR REPLACE VIEW ai_cost_by_user AS
SELECT
  user_id,
  SUM(cost_usd)               AS total_cost_usd,
  SUM(input_tokens)           AS total_input_tokens,
  SUM(output_tokens)          AS total_output_tokens,
  COUNT(*)                    AS total_calls,
  MAX(created_at)             AS last_call_at
FROM ai_cost_logs
WHERE user_id IS NOT NULL
GROUP BY user_id;
