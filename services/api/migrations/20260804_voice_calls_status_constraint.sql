-- ─── voice_calls status constraint genişletme (4 Ağustos 2026) ───────────────
-- 'ringing' ve 'in_progress' Twilio engine için gerekli ama eski constraint'te yok.
-- Sessiz başarısız olan tüm _updateCallStatus çağrılarını düzeltir.

ALTER TABLE voice_calls DROP CONSTRAINT IF EXISTS voice_calls_status_check;

ALTER TABLE voice_calls ADD CONSTRAINT voice_calls_status_check
  CHECK (status IN (
    'initiating',   -- kayıt oluşturuldu, Twilio çağrısı başlamadı
    'ringing',      -- Twilio: numara çalıyor
    'calling',      -- Vapi legacy
    'in_progress',  -- Twilio: cevaplanıp konuşma başladı
    'completed',    -- arama tamamlandı
    'failed',       -- bağlanamadı / hata
    'no-answer',    -- cevap alınamadı
    'busy'          -- meşgul
  ));
