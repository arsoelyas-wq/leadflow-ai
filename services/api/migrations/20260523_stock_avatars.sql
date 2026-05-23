-- ─── STOCK AVATARS — OWN AVATAR LIBRARY (LatentSync powered) ────────────────
-- Professional pre-built avatars. No D-ID, no HeyGen credits needed.
-- Video generation: seed_video + ElevenLabs audio → LatentSync (Replicate) → talking head video
-- Seed videos: upload to Supabase video-assets/avatar-seeds/ via admin panel

CREATE TABLE IF NOT EXISTS stock_avatars (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL UNIQUE,
  display_name         TEXT NOT NULL,
  gender               TEXT NOT NULL DEFAULT 'neutral'
    CHECK (gender IN ('male', 'female', 'neutral')),
  age_group            TEXT NOT NULL DEFAULT 'adult'
    CHECK (age_group IN ('young', 'adult', 'senior')),
  style                TEXT NOT NULL DEFAULT 'professional'
    CHECK (style IN ('professional', 'casual', 'energetic', 'warm', 'executive')),
  languages            TEXT[] NOT NULL DEFAULT ARRAY['tr', 'en'],
  thumbnail_url        TEXT,           -- static image shown in gallery
  preview_video_url    TEXT,           -- short preview clip (optional, cached)
  latentsync_video_url TEXT,           -- REQUIRED: seed video for LatentSync lip-sync
  tags                 TEXT[] DEFAULT '{}',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  is_featured          BOOLEAN NOT NULL DEFAULT false,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_avatars_active_idx  ON stock_avatars(is_active, sort_order);
CREATE INDEX IF NOT EXISTS stock_avatars_gender_idx  ON stock_avatars(gender);
CREATE INDEX IF NOT EXISTS stock_avatars_style_idx   ON stock_avatars(style);

-- ─── SEED: 8 Professional Avatars ────────────────────────────────────────────
-- Thumbnails from Unsplash (free, no auth needed)
-- latentsync_video_url: upload seed videos via /admin/avatar-library in dashboard
-- Recommended: Pexels "person talking to camera" videos (free, royalty-free)
--   Search: https://www.pexels.com/search/videos/business%20person%20talking/

INSERT INTO stock_avatars
  (name, display_name, gender, age_group, style, languages, thumbnail_url, tags, is_featured, sort_order)
VALUES
(
  'aria_professional',
  'Aria — Profesyonel',
  'female', 'adult', 'professional',
  ARRAY['tr','en','de','fr'],
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=533&fit=crop&auto=format',
  ARRAY['business','formal','modern','multilingual'],
  true, 1
),
(
  'ethan_executive',
  'Ethan — Yönetici',
  'male', 'adult', 'executive',
  ARRAY['tr','en','de'],
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=533&fit=crop&auto=format',
  ARRAY['executive','leadership','formal'],
  true, 2
),
(
  'sofia_warm',
  'Sofia — Sıcak',
  'female', 'adult', 'warm',
  ARRAY['tr','en','es','fr'],
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=533&fit=crop&auto=format',
  ARRAY['friendly','approachable','warm','sales'],
  true, 3
),
(
  'james_casual',
  'James — Rahat',
  'male', 'adult', 'casual',
  ARRAY['tr','en'],
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=533&fit=crop&auto=format',
  ARRAY['casual','relatable','startup','tech'],
  false, 4
),
(
  'lena_energetic',
  'Lena — Enerjik',
  'female', 'young', 'energetic',
  ARRAY['tr','en','de'],
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=533&fit=crop&auto=format',
  ARRAY['energetic','young','dynamic','startup'],
  false, 5
),
(
  'omar_professional',
  'Omar — Profesyonel',
  'male', 'adult', 'professional',
  ARRAY['tr','en','ar'],
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=533&fit=crop&auto=format',
  ARRAY['professional','multilingual','arabic','business'],
  true, 6
),
(
  'maya_executive',
  'Maya — Direktör',
  'female', 'senior', 'executive',
  ARRAY['tr','en'],
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=533&fit=crop&auto=format',
  ARRAY['senior','authoritative','finance','legal'],
  false, 7
),
(
  'alex_tech',
  'Alex — Teknoloji',
  'neutral', 'adult', 'casual',
  ARRAY['tr','en'],
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=533&fit=crop&auto=format',
  ARRAY['tech','startup','casual','innovation'],
  false, 8
)
ON CONFLICT (name) DO UPDATE SET
  thumbnail_url = EXCLUDED.thumbnail_url,
  tags          = EXCLUDED.tags,
  is_featured   = EXCLUDED.is_featured,
  sort_order    = EXCLUDED.sort_order;
