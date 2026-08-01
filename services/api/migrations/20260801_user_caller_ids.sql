-- ─── LeadFlow: Müşteri Arama Numaraları (1 Ağustos 2026) ───────────────────────
-- Müşteri kendi telefon numarasını sisteme ekler, Twilio doğrulama kodu gönderir,
-- onaylandıktan sonra o numara outbound aramalarda callerId olarak kullanılır.
--
-- Twilio Verified Caller ID mekanizması:
--   1. POST /api/voice/caller-ids/add         → Twilio doğrulama isteği başlat
--   2. POST /api/voice/caller-ids/verify       → Kullanıcı kodu girer, Twilio onaylar
--   3. POST /api/voice/caller-ids/:id/default  → Varsayılan numara seç
--   4. DELETE /api/voice/caller-ids/:id        → Numarayı sil

CREATE TABLE IF NOT EXISTS user_caller_ids (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Müşterinin kendi telefon numarası (E.164)
  phone_number          TEXT NOT NULL,
  friendly_name         TEXT,          -- "İş Hattım", "Satış Departmanı" vb.

  -- Twilio doğrulama
  twilio_validation_sid TEXT,          -- Twilio'nun döndürdüğü doğrulama işlem ID'si
  is_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,

  -- Müşterinin bu numarasını hangi dil/ülke için kullandığı
  country_code          TEXT,          -- TR, DE, EN vb.

  -- Varsayılan numara (bu kullanıcının aramaları için kullanılır)
  is_default            BOOLEAN NOT NULL DEFAULT FALSE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aynı kullanıcı aynı numarayı iki kez ekleyemesin
CREATE UNIQUE INDEX IF NOT EXISTS user_caller_ids_unique_phone
  ON user_caller_ids(user_id, phone_number);

-- Lookup index
CREATE INDEX IF NOT EXISTS user_caller_ids_user_idx
  ON user_caller_ids(user_id)
  WHERE is_verified = TRUE;

-- RLS
ALTER TABLE user_caller_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_caller_ids_own" ON user_caller_ids
  FOR ALL USING (auth.uid() = user_id);

-- Service key full access (API sunucusu)
CREATE POLICY "user_caller_ids_service" ON user_caller_ids
  FOR ALL USING (TRUE)
  WITH CHECK (TRUE);

-- updated_at otomatik güncelle
CREATE OR REPLACE FUNCTION update_user_caller_ids_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_caller_ids_updated_at ON user_caller_ids;
CREATE TRIGGER user_caller_ids_updated_at
  BEFORE UPDATE ON user_caller_ids
  FOR EACH ROW EXECUTE FUNCTION update_user_caller_ids_updated_at();
