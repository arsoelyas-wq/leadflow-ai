-- ─── USER REPLICAS ────────────────────────────────────────────────────────────
-- Stores trained AI avatar replicas per user (3DGS, LatentSync, or HeyGen)

CREATE TABLE IF NOT EXISTS user_replicas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  language            TEXT NOT NULL DEFAULT 'tr',
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  engine              TEXT NOT NULL DEFAULT 'latentsync'
    CHECK (engine IN ('latentsync', 'gaussian', 'heygen', 'elevenlabs')),
  seed_video_url      TEXT,
  seed_video_duration INTEGER,                      -- seconds
  elevenlabs_voice_id TEXT,                         -- cloned voice ID
  gaussian_model_url  TEXT,                         -- trained 3DGS checkpoint URL
  preview_video_url   TEXT,
  training_job_id     TEXT,
  error_message       TEXT,
  is_default          BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_replicas_user_id_idx ON user_replicas(user_id);

-- Ensure only one default per user
CREATE UNIQUE INDEX IF NOT EXISTS user_replicas_default_unique
  ON user_replicas(user_id) WHERE (is_default = true AND status = 'ready');

-- ─── REPLICA JOBS ─────────────────────────────────────────────────────────────
-- Async job tracking for voice cloning / 3DGS training / test video

CREATE TABLE IF NOT EXISTS replica_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replica_id  UUID NOT NULL REFERENCES user_replicas(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type    TEXT NOT NULL
    CHECK (job_type IN ('voice_clone', 'model_train', 'test_video')),
  provider    TEXT NOT NULL,                        -- 'elevenlabs', 'replicate', 'runpod'
  provider_job_id TEXT,
  status      TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  result_url  TEXT,
  error       TEXT,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS replica_jobs_replica_id_idx ON replica_jobs(replica_id);
CREATE INDEX IF NOT EXISTS replica_jobs_user_id_idx   ON replica_jobs(user_id);

-- ─── VIDEO OUTREACH — ADD REPLICA + ENGINE COLUMNS ────────────────────────────

ALTER TABLE video_outreach
  ADD COLUMN IF NOT EXISTS replica_id        UUID REFERENCES user_replicas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS engine            TEXT DEFAULT 'heygen',
  ADD COLUMN IF NOT EXISTS emotion_profile   JSONB,
  ADD COLUMN IF NOT EXISTS post_processed    BOOLEAN DEFAULT false;

-- ─── VIDEO SEQUENCES — TRACK emotion context ──────────────────────────────────

ALTER TABLE video_sequences
  ADD COLUMN IF NOT EXISTS emotion_profile JSONB;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE user_replicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE replica_jobs  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_replicas' AND policyname = 'replica owner') THEN
    CREATE POLICY "replica owner" ON user_replicas
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'replica_jobs' AND policyname = 'replica_jobs owner') THEN
    CREATE POLICY "replica_jobs owner" ON replica_jobs
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─── STORAGE BUCKET for seed videos ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'replica-seeds',
  'replica-seeds',
  false,
  524288000,   -- 500 MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'replica-seeds owner upload') THEN
    CREATE POLICY "replica-seeds owner upload" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'replica-seeds' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'replica-seeds owner read') THEN
    CREATE POLICY "replica-seeds owner read" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'replica-seeds' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'replica-seeds service') THEN
    CREATE POLICY "replica-seeds service" ON storage.objects
      FOR ALL TO service_role
      USING (bucket_id = 'replica-seeds');
  END IF;
END $$;
