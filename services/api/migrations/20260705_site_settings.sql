-- Site-wide key-value settings store (landing page config, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed empty landing config so GET returns 200 even before first admin save
INSERT INTO site_settings (key, value)
VALUES ('landing_home', '{}')
ON CONFLICT (key) DO NOTHING;
