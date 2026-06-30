-- ─── VIDEO OUTREACH — eksik kolonlar ─────────────────────────────────────────
-- Bu kolonlar kodda kullanılıyor ama production DB'de yok.
-- Phase 2 (script+hook) ve Phase 3 (tamamlama) güncellemeleri bu eksikler
-- nedeniyle sessizce başarısız oluyordu — status 'generating'de takılıp kalıyordu.
-- 30 Haziran 2026 tarihinde tespit edildi.

ALTER TABLE video_outreach
  ADD COLUMN IF NOT EXISTS hook_a            TEXT,
  ADD COLUMN IF NOT EXISTS hook_b            TEXT,
  ADD COLUMN IF NOT EXISTS active_hook       TEXT CHECK (active_hook IN ('a', 'b')),
  ADD COLUMN IF NOT EXISTS script_score      INTEGER CHECK (script_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS optimal_send_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS send_time_reason  TEXT,
  ADD COLUMN IF NOT EXISTS tech_stack        JSONB,
  ADD COLUMN IF NOT EXISTS job_signals       JSONB,
  ADD COLUMN IF NOT EXISTS growth_stage      TEXT,
  ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ;

-- İndeksler: zaman bazlı sorgular için
CREATE INDEX IF NOT EXISTS video_outreach_optimal_send_at_idx ON video_outreach(optimal_send_at)
  WHERE optimal_send_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS video_outreach_completed_at_idx ON video_outreach(completed_at)
  WHERE completed_at IS NOT NULL;
