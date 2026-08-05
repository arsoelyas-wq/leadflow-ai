-- LeadFlow: Phone Number Store — kullanıcıların satın aldığı Twilio numaraları (5 Ağustos 2026)
-- Plan'a dahildir, ayrı ödeme alınmaz.

CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL,
  phone_number            TEXT NOT NULL,
  friendly_name           TEXT,
  country_code            TEXT NOT NULL,
  country_name            TEXT NOT NULL,
  capabilities_voice      BOOLEAN DEFAULT FALSE,
  capabilities_sms        BOOLEAN DEFAULT FALSE,
  capabilities_whatsapp   BOOLEAN DEFAULT FALSE,
  twilio_sid              TEXT NOT NULL,
  twilio_monthly_cost     INTEGER NOT NULL DEFAULT 0,
  our_monthly_price       INTEGER NOT NULL DEFAULT 0,
  stripe_subscription_item_id TEXT,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'releasing', 'released')),
  wa_registered           BOOLEAN DEFAULT FALSE,
  wa_messaging_service_sid TEXT,
  purchased_at            TIMESTAMPTZ DEFAULT NOW(),
  released_at             TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id
  ON user_phone_numbers(user_id);

CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_status
  ON user_phone_numbers(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone_numbers_twilio_sid
  ON user_phone_numbers(twilio_sid);
