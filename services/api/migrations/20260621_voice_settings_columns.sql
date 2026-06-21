-- ============================================================
-- Voice Settings — Numara Doğrulama + Ses Ayarları Kolonları
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times (IF NOT EXISTS)
-- ============================================================

-- Numara doğrulama
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS pending_phone    TEXT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS verified_phone   TEXT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS verify_code      TEXT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS verify_expires   TIMESTAMPTZ;

-- Vapi phone ID (müşterinin kendi numarası)
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS vapi_phone_id    TEXT;

-- Temsilci profili
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS company_name           TEXT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS product_description    TEXT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS transfer_number        TEXT;

-- Ses ayarları
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_speed     FLOAT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_pitch     FLOAT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_bass      FLOAT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_treble    FLOAT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_warmth    FLOAT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_presence  FLOAT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_volume    FLOAT;
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_compress  FLOAT;

-- Voice provider
ALTER TABLE voice_settings ADD COLUMN IF NOT EXISTS voice_provider  TEXT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'voice_settings'
ORDER BY ordinal_position;
