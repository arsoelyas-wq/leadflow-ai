-- Proposals V2 — view tracking, tax, discount, IBAN, portal link
-- Run in Supabase SQL Editor

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS view_token      text,
  ADD COLUMN IF NOT EXISTS view_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viewed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at     timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by     text,
  ADD COLUMN IF NOT EXISTS accepted_title  text,
  ADD COLUMN IF NOT EXISTS signature_data  text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at     timestamptz,
  ADD COLUMN IF NOT EXISTS tax_rate        numeric NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms   text DEFAULT '30 gün net',
  ADD COLUMN IF NOT EXISTS iban            text,
  ADD COLUMN IF NOT EXISTS bank_name       text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_phone   text,
  ADD COLUMN IF NOT EXISTS company_email   text,
  ADD COLUMN IF NOT EXISTS company_logo_url text,
  ADD COLUMN IF NOT EXISTS currency        text NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS sender_company  text;

-- Backfill view tokens for existing rows
UPDATE proposals
SET view_token = encode(gen_random_bytes(16), 'hex')
WHERE view_token IS NULL;

-- Unique constraint on view_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_view_token_unique'
  ) THEN
    ALTER TABLE proposals ADD CONSTRAINT proposals_view_token_unique UNIQUE (view_token);
  END IF;
END $$;

-- Index for portal lookups
CREATE INDEX IF NOT EXISTS idx_proposals_view_token ON proposals(view_token);
CREATE INDEX IF NOT EXISTS idx_proposals_user_status ON proposals(user_id, status, created_at DESC);
