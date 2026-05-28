-- AR Models table
CREATE TABLE IF NOT EXISTS ar_models (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name    TEXT        NOT NULL,
  description     TEXT        DEFAULT '',
  category        TEXT        DEFAULT 'general',
  model_url       TEXT        NOT NULL,
  ar_viewer_url   TEXT        NOT NULL DEFAULT '',
  qr_url          TEXT        DEFAULT '',
  file_size       INTEGER     DEFAULT 0,
  file_type       TEXT        DEFAULT 'glb',
  view_count      INTEGER     DEFAULT 0,
  ar_session_count INTEGER    DEFAULT 0,
  send_count      INTEGER     DEFAULT 0,
  total_view_seconds INTEGER  DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- AR Analytics table
CREATE TABLE IF NOT EXISTS ar_analytics (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id         UUID        NOT NULL REFERENCES ar_models(id) ON DELETE CASCADE,
  event            TEXT        NOT NULL,
  is_mobile        BOOLEAN     DEFAULT FALSE,
  is_ios           BOOLEAN     DEFAULT FALSE,
  user_agent       TEXT        DEFAULT '',
  duration_seconds INTEGER     DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ar_models_user_id      ON ar_models  (user_id);
CREATE INDEX IF NOT EXISTS idx_ar_models_created_at   ON ar_models  (created_at);
CREATE INDEX IF NOT EXISTS idx_ar_analytics_model_id  ON ar_analytics (model_id);
CREATE INDEX IF NOT EXISTS idx_ar_analytics_event     ON ar_analytics (event);
CREATE INDEX IF NOT EXISTS idx_ar_analytics_created_at ON ar_analytics (created_at);
