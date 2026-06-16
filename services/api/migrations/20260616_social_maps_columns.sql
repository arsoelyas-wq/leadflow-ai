-- ============================================================
-- Sovlo AI — Social Media + Maps Columns Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS checks)
-- ============================================================

-- Social media links (added in bf3b5a0 but never had a migration file)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram     TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS facebook      TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_url  TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS youtube       TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS twitter       TEXT;

-- Google Maps URL (deep link to business listing)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS maps_url      TEXT;

-- Business opening hours (JSON string from Apify)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opening_hours TEXT;

-- Verify all columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('instagram','facebook','linkedin_url','youtube','twitter','maps_url','opening_hours')
ORDER BY column_name;
