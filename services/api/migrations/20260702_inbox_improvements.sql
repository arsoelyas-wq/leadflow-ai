-- ─── INBOX İYİLEŞTİRMELER — mesaj merkezi upgrade ───────────────────────────
-- 2 Temmuz 2026

-- Mesajlara medya + yanıt-zinciri + meta veri desteği
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media        JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reply_to_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata     JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS edited_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

-- Medya içeren mesajlar için index
CREATE INDEX IF NOT EXISTS messages_media_idx      ON messages((media IS NOT NULL)) WHERE media IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_reply_to_idx   ON messages(reply_to_id)         WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_lead_sent_idx  ON messages(lead_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS messages_user_unread_idx ON messages(user_id, read, direction) WHERE read = false AND direction = 'in';

-- Özelleştirilebilir hızlı yanıt şablonları
CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  category     TEXT DEFAULT 'genel'
    CHECK (category IN ('genel','selamlama','itiraz','kapaniş','takip','teklif')),
  shortcut     TEXT,          -- /selamla gibi slash kısayol
  channel      TEXT,          -- null = tüm kanallar, 'whatsapp'/'email'
  usage_count  INTEGER DEFAULT 0,
  pinned       BOOLEAN DEFAULT false,
  icon         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, title)
);

CREATE INDEX IF NOT EXISTS qrt_user_idx    ON quick_reply_templates(user_id);
CREATE INDEX IF NOT EXISTS qrt_pinned_idx  ON quick_reply_templates(user_id, pinned, usage_count DESC);

-- Varsayılan şablonlar (yeni kullanıcılar için)
INSERT INTO quick_reply_templates (user_id, title, content, category, pinned, icon)
SELECT
  u.id,
  s.title, s.content, s.category, s.pinned, s.icon
FROM users u
CROSS JOIN (VALUES
  ('Teşekkür', 'Teşekkür ederiz, en kısa sürede dönüyoruz. 🙏', 'genel', true, '🙏'),
  ('Katalog', 'Kataloğumuzu hemen paylaşıyorum, incelemenizi rica ederim.', 'genel', true, '📎'),
  ('Toplantı', 'Toplantı için uygun zamanınızı paylaşır mısınız? Size en uygun saati ayarlayabiliriz.', 'kapaniş', true, '📅'),
  ('Teklif', 'Teklifinizi hazırlıyoruz, yakında iletiyoruz. Herhangi bir sorunuz olursa buradayız.', 'teklif', false, '💼'),
  ('Bilgi', 'Bilgi için teşekkürler! Konuyu inceleyip size en kısa sürede geri döneceğiz.', 'takip', false, '✅'),
  ('Fiyat', 'Fiyat bilgisi için detaylı bir görüşme yapmamız gerekiyor. 15 dakikanız var mı?', 'itiraz', false, '💰')
) AS s(title, content, category, pinned, icon)
ON CONFLICT (user_id, title) DO NOTHING;
