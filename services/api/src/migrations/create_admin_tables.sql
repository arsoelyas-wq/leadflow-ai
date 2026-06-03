-- LeadFlow Admin OS — Database Tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email varchar(200) NOT NULL,
  token_hash varchar(500) NOT NULL,
  ip_address varchar(50),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_activity timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email varchar(200) NOT NULL,
  action varchar(100) NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}',
  ip_address varchar(50),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type varchar(30) NOT NULL DEFAULT 'dashboard',
  target_slug varchar(20) DEFAULT 'all',
  target_plan varchar(20) DEFAULT 'all',
  title varchar(200),
  message text,
  cta_text varchar(100),
  cta_url text,
  image_url text,
  video_url text,
  is_active boolean DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  click_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code varchar(50) UNIQUE NOT NULL,
  type varchar(20) NOT NULL DEFAULT 'credits',
  value integer NOT NULL DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by varchar(200),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key varchar(100) UNIQUE NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  enabled_for_plans jsonb DEFAULT '[]',
  enabled_for_users jsonb DEFAULT '[]',
  rollout_percent integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_email ON admin_audit_logs (admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_banners_active ON admin_banners (is_active, type);

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('admin_sessions','admin_audit_logs','admin_banners','promo_codes','feature_flags')
ORDER BY table_name;
