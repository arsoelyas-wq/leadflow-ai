-- Inbox v2: pinned conversations, labels, auto-reply toggle, internal notes, phone normalization

-- 1. leads tablosuna yeni sütunlar
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_leads_pinned ON leads(user_id, pinned) WHERE pinned = TRUE;

-- 2. İç notlar tablosu (takım üyelerine görünür, müşteriye değil)
CREATE TABLE IF NOT EXISTS internal_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_notes_lead ON internal_notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_notes_user ON internal_notes(user_id);

-- 3. Telefon numarasını normalize eden fonksiyon (sadece rakamlar)
-- Kullanım: normalize_phone('+90 505 452 95 68') → '905054529568'
CREATE OR REPLACE FUNCTION normalize_phone(p TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(p, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Mevcut leads'lerdeki telefon numaralarını normalize et
-- (sadece rakam olmayan karakterleri temizle)
UPDATE leads
SET phone = regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL
  AND phone ~ '[^0-9]';

-- 5. messages tablosunda wa_message_id indexi (dedup sorguları için)
CREATE INDEX IF NOT EXISTS idx_messages_wa_id
  ON messages((metadata->>'wa_message_id'))
  WHERE metadata->>'wa_message_id' IS NOT NULL;

-- 6. Response time hesabı için index (conversations query hızlandırır)
CREATE INDEX IF NOT EXISTS idx_messages_direction_sent
  ON messages(user_id, lead_id, direction, sent_at DESC);
