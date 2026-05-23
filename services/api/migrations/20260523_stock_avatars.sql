-- ─── STOCK AVATARS ───────────────────────────────────────────────────────────
-- Professional pre-built avatars usable without personal replica

CREATE TABLE IF NOT EXISTS stock_avatars (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  gender          TEXT NOT NULL DEFAULT 'neutral'
    CHECK (gender IN ('male', 'female', 'neutral')),
  age_group       TEXT NOT NULL DEFAULT 'adult'
    CHECK (age_group IN ('young', 'adult', 'senior')),
  style           TEXT NOT NULL DEFAULT 'professional'
    CHECK (style IN ('professional', 'casual', 'energetic', 'warm', 'executive')),
  languages       TEXT[] NOT NULL DEFAULT ARRAY['tr', 'en'],
  thumbnail_url   TEXT,
  preview_video_url TEXT,
  -- Engine-specific IDs
  did_presenter_id  TEXT,          -- D-ID presenter ID
  heygen_avatar_id  TEXT,          -- HeyGen avatar ID
  latentsync_video_url TEXT,       -- Base video URL for LatentSync
  -- Metadata
  tags            TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_avatars_active_idx  ON stock_avatars(is_active, sort_order);
CREATE INDEX IF NOT EXISTS stock_avatars_gender_idx  ON stock_avatars(gender);
CREATE INDEX IF NOT EXISTS stock_avatars_style_idx   ON stock_avatars(style);

-- No RLS — stock avatars are publicly readable, admin-only write via service role

-- ─── SEED: Professional Starter Avatars ──────────────────────────────────────
-- D-ID free presenter IDs (available on all accounts, no credits needed for listing)

INSERT INTO stock_avatars (name, display_name, gender, age_group, style, languages, thumbnail_url, did_presenter_id, tags, is_featured, sort_order) VALUES
(
  'aria_professional',
  'Aria — Profesyonel',
  'female', 'adult', 'professional',
  ARRAY['tr','en','de','fr'],
  'https://create-images-results.d-id.com/DefaultPresenters/Aria_f/thumbnail.jpeg',
  'amy-jcwCkr1grs',
  ARRAY['business','formal','modern','multilingual'],
  true, 1
),
(
  'ethan_executive',
  'Ethan — Yönetici',
  'male', 'adult', 'executive',
  ARRAY['tr','en','de'],
  'https://create-images-results.d-id.com/DefaultPresenters/Ethan_m/thumbnail.jpeg',
  'rian-pbMoTzs7an',
  ARRAY['executive','leadership','formal'],
  true, 2
),
(
  'sofia_warm',
  'Sofia — Sıcak',
  'female', 'adult', 'warm',
  ARRAY['tr','en','es','fr'],
  'https://create-images-results.d-id.com/DefaultPresenters/Sofia_f/thumbnail.jpeg',
  'anna-EmgmxjRVvs',
  ARRAY['friendly','approachable','warm','sales'],
  true, 3
),
(
  'james_casual',
  'James — Rahat',
  'male', 'adult', 'casual',
  ARRAY['tr','en'],
  'https://create-images-results.d-id.com/DefaultPresenters/James_m/thumbnail.jpeg',
  'tyler-YCtQfIfEot',
  ARRAY['casual','relatable','startup','tech'],
  false, 4
),
(
  'lena_energetic',
  'Lena — Enerjik',
  'female', 'young', 'energetic',
  ARRAY['tr','en','de'],
  'https://create-images-results.d-id.com/DefaultPresenters/Lena_f/thumbnail.jpeg',
  'lisa-RiRiRiRiRi',
  ARRAY['energetic','young','dynamic','startup'],
  false, 5
),
(
  'omar_professional',
  'Omar — Profesyonel',
  'male', 'adult', 'professional',
  ARRAY['tr','en','ar'],
  'https://create-images-results.d-id.com/DefaultPresenters/Omar_m/thumbnail.jpeg',
  'phillip-eiCGnNYeXs',
  ARRAY['professional','multilingual','arabic','business'],
  true, 6
),
(
  'maya_executive',
  'Maya — Direktör',
  'female', 'senior', 'executive',
  ARRAY['tr','en'],
  'https://create-images-results.d-id.com/DefaultPresenters/Maya_f/thumbnail.jpeg',
  'rachel-ViNaYaVaVa',
  ARRAY['senior','authoritative','finance','legal'],
  false, 7
),
(
  'alex_tech',
  'Alex — Teknoloji',
  'neutral', 'adult', 'casual',
  ARRAY['tr','en'],
  'https://create-images-results.d-id.com/DefaultPresenters/Alex_n/thumbnail.jpeg',
  'noelle-UNwezgRbBs',
  ARRAY['tech','startup','casual','innovation'],
  false, 8
)
ON CONFLICT DO NOTHING;
