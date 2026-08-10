-- A/B Test Engine — ad creative variants table
-- Run in Supabase SQL Editor (2026-08-10)

CREATE TABLE IF NOT EXISTS ad_ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_ad_id TEXT NOT NULL,
  variant_ad_id TEXT,
  original_headline TEXT,
  variant_headline TEXT,
  original_body TEXT,
  variant_body TEXT,
  status TEXT DEFAULT 'pending', -- pending | running | completed | failed
  winner TEXT,                   -- 'original' | 'variant' | 'tie' | null
  original_ctr NUMERIC(6,4),
  variant_ctr NUMERIC(6,4),
  original_cpl NUMERIC(10,2),
  variant_cpl NUMERIC(10,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
