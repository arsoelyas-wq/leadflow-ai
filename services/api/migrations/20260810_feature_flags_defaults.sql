-- Feature flags: video_outreach ve google_ads varsayılan olarak disabled
INSERT INTO feature_flags (flag_key, status, is_enabled, description, updated_at)
VALUES
  ('video_outreach', 'disabled', false, 'AI Video Outreach — geliştirme aşamasında', NOW()),
  ('google_ads',     'disabled', false, 'Google Ads entegrasyonu — geliştirme aşamasında', NOW())
ON CONFLICT (flag_key) DO UPDATE
  SET status = EXCLUDED.status,
      is_enabled = EXCLUDED.is_enabled,
      updated_at = EXCLUDED.updated_at;
