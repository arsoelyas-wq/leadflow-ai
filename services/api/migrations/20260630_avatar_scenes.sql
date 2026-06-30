-- ─── SCENE / ENVIRONMENT SUPPORT — stock avatars + personal replicas ────────
-- Lets a single "character" (stock or personal) have multiple seed videos
-- shot in different environments (office, studio, home, outdoor, field).
-- The video pipeline stays video-to-video (no synthetic background
-- compositing) — each scene is a real, separately filmed seed video, so
-- MuseTalk/LatentSync always lip-syncs onto real footage = natural result.

ALTER TABLE stock_avatars
  ADD COLUMN IF NOT EXISTS scene_type TEXT NOT NULL DEFAULT 'studio'
    CHECK (scene_type IN ('studio', 'office', 'home', 'outdoor', 'field')),
  ADD COLUMN IF NOT EXISTS character_group TEXT;

-- Backfill: each existing avatar is its own character group (no other scenes yet)
UPDATE stock_avatars SET character_group = name WHERE character_group IS NULL;

ALTER TABLE stock_avatars ALTER COLUMN character_group SET NOT NULL;

CREATE INDEX IF NOT EXISTS stock_avatars_character_group_idx ON stock_avatars(character_group);

ALTER TABLE user_replicas
  ADD COLUMN IF NOT EXISTS scene_type TEXT NOT NULL DEFAULT 'studio'
    CHECK (scene_type IN ('studio', 'office', 'home', 'outdoor', 'field')),
  ADD COLUMN IF NOT EXISTS character_group TEXT;

-- Backfill: group by user + lowercased name prefix (before " - " separator if present)
UPDATE user_replicas
  SET character_group = lower(split_part(name, ' - ', 1))
  WHERE character_group IS NULL;

CREATE INDEX IF NOT EXISTS user_replicas_character_group_idx ON user_replicas(user_id, character_group);
