-- Error monitoring tablosu
CREATE TABLE IF NOT EXISTS error_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message     text NOT NULL,
  stack       text,
  context     jsonb,
  created_at  timestamptz DEFAULT now()
);

-- 30 günden eski kayıtları otomatik sil (cron job veya pg_cron ile)
-- CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs(created_at);

-- Admin dışında erişim yok
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "error_logs_service_only" ON error_logs;
CREATE POLICY "error_logs_service_only" ON error_logs USING (auth.role() = 'service_role');
