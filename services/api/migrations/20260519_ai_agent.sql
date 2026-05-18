-- AI Sales Agent Migration
-- Run in Supabase SQL Editor

-- Agent configuration per user (what they sell, who they target)
CREATE TABLE IF NOT EXISTS ai_agent_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE,
  product_description   text NOT NULL DEFAULT '',
  target_customer       text NOT NULL DEFAULT '',
  pain_solved           text NOT NULL DEFAULT '',
  price_range_min       numeric DEFAULT 0,
  price_range_max       numeric DEFAULT 0,
  price_currency        text DEFAULT '₺',
  value_props           text[] DEFAULT ARRAY[]::text[],
  proposal_template     text,
  escalation_triggers   text[] DEFAULT ARRAY['görüşelim','fiyat ver','tamam','alalım','anlaşalım','ne zaman','toplantı'],
  auto_reply_enabled    boolean NOT NULL DEFAULT true,
  auto_proposal_enabled boolean NOT NULL DEFAULT false,
  voice_call_enabled    boolean NOT NULL DEFAULT false,
  video_msg_enabled     boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT false,
  leads_processed       integer NOT NULL DEFAULT 0,
  messages_sent         integer NOT NULL DEFAULT 0,
  replies_received      integer NOT NULL DEFAULT 0,
  proposals_sent        integer NOT NULL DEFAULT 0,
  deals_escalated       integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Cached research results per lead
CREATE TABLE IF NOT EXISTS ai_agent_research (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid NOT NULL UNIQUE,
  user_id             uuid NOT NULL,
  website_content     text,
  maps_rating         numeric,
  maps_review_count   integer,
  maps_reviews        text,
  pain_points         text[] DEFAULT ARRAY[]::text[],
  opportunities       text[] DEFAULT ARRAY[]::text[],
  personalized_opener text,
  talking_points      text[] DEFAULT ARRAY[]::text[],
  red_flags           text[] DEFAULT ARRAY[]::text[],
  best_channel        text DEFAULT 'whatsapp',
  best_time           text DEFAULT 'Sabah',
  confidence_score    integer DEFAULT 0,
  summary             text,
  researched_at       timestamptz NOT NULL DEFAULT now()
);

-- Per-lead conversation state managed by AI
CREATE TABLE IF NOT EXISTS ai_agent_conversations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id              uuid NOT NULL,
  user_id              uuid NOT NULL,
  channel              text NOT NULL DEFAULT 'whatsapp',
  ai_mode              text NOT NULL DEFAULT 'active',
  -- active | paused | human_takeover | completed | not_interested
  turn_count           integer NOT NULL DEFAULT 0,
  last_intent          text,
  -- greeting | question | price_inquiry | objection | meeting_request | ready_to_buy | not_interested
  conversation_summary text,
  last_ai_message      text,
  last_human_message   text,
  proposal_sent        boolean NOT NULL DEFAULT false,
  proposal_sent_at     timestamptz,
  voice_triggered      boolean NOT NULL DEFAULT false,
  video_sent           boolean NOT NULL DEFAULT false,
  escalated            boolean NOT NULL DEFAULT false,
  escalated_at         timestamptz,
  escalation_reason    text,
  last_processed_msg   text,  -- message_id of last processed incoming msg
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, channel)
);

-- Full activity log for agent actions
CREATE TABLE IF NOT EXISTS ai_agent_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  lead_id     uuid,
  event_type  text NOT NULL,
  -- research_started | research_complete | outreach_sent | reply_received
  -- intent_detected | ai_reply_sent | proposal_sent | escalated
  -- voice_triggered | video_sent | error
  channel     text,
  content     text,
  intent      text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ai_agent_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_research       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_runs           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_profile_rw"   ON ai_agent_profiles     USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_research_rw"  ON ai_agent_research      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_conv_rw"      ON ai_agent_conversations USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_runs_r"       ON ai_agent_runs          USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_research_lead    ON ai_agent_research(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_lead        ON ai_agent_conversations(lead_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_active      ON ai_agent_conversations(ai_mode, user_id) WHERE ai_mode = 'active';
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_time   ON ai_agent_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_lead        ON ai_agent_runs(lead_id, created_at DESC);
