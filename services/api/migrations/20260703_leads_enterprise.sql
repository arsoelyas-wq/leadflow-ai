-- ─── LEAD VERİTABANI — ENTERPRISE UPGRADE ────────────────────────────────────
-- 3 Temmuz 2026
-- Soft delete, audit log, smart segments, custom fields

-- ─── 1. SOFT DELETE ──────────────────────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,      -- Silme tarihi (NULL = aktif)
  ADD COLUMN IF NOT EXISTS deleted_by    UUID,             -- Kim sildi
  ADD COLUMN IF NOT EXISTS restored_at   TIMESTAMPTZ;      -- Geri alındı mı

CREATE INDEX IF NOT EXISTS leads_deleted_idx     ON leads(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_active_user_idx ON leads(user_id, deleted_at, created_at DESC)
  WHERE deleted_at IS NULL;

-- ─── 2. AUDIT LOG (Kim ne değiştirdi?) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_field_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_name  TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_at  TIMESTAMPTZ DEFAULT NOW(),
  action      TEXT NOT NULL DEFAULT 'update'  -- 'create' | 'update' | 'delete' | 'restore'
);

CREATE INDEX IF NOT EXISTS lfh_lead_idx    ON lead_field_history(lead_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS lfh_user_idx    ON lead_field_history(user_id, changed_at DESC);

-- ─── 3. SMART SEGMENTS (Kayıtlı filtreler) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS smart_segments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  filters     JSONB NOT NULL DEFAULT '{}',  -- { status, sector, grade, min_score, search, ... }
  icon        TEXT DEFAULT '🎯',
  color       TEXT DEFAULT '#4F46E5',
  is_pinned   BOOLEAN DEFAULT false,
  lead_count  INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS ss_user_idx ON smart_segments(user_id, is_pinned DESC, created_at DESC);

-- ─── 4. CUSTOM FIELDS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_custom_field_defs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_key    TEXT NOT NULL,   -- Makine adı: 'budget_try', 'decision_date'
  field_label  TEXT NOT NULL,   -- Gösterilen ad: 'Bütçe (₺)', 'Karar Tarihi'
  field_type   TEXT NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text','number','date','select','checkbox','url')),
  options      JSONB,           -- select tipi için: ["A", "B", "C"]
  placeholder  TEXT,
  required     BOOLEAN DEFAULT false,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, field_key)
);

CREATE TABLE IF NOT EXISTS lead_custom_values (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_key    TEXT NOT NULL,
  value        TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, field_key)
);

CREATE INDEX IF NOT EXISTS lcv_lead_idx ON lead_custom_values(lead_id);
CREATE INDEX IF NOT EXISTS lcv_user_field_idx ON lead_custom_values(user_id, field_key);

-- ─── 5. LEADS EK KOLONLAR ────────────────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deal_value     NUMERIC(15,2),    -- Fırsat değeri (₺)
  ADD COLUMN IF NOT EXISTS win_probability INTEGER DEFAULT 50 CHECK (win_probability BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS next_action    TEXT,             -- AI önerilen sonraki adım
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,      -- Ne zaman yapılacak
  ADD COLUMN IF NOT EXISTS tags           TEXT[] DEFAULT '{}';  -- Etiketler

CREATE INDEX IF NOT EXISTS leads_tags_idx ON leads USING GIN(tags);
CREATE INDEX IF NOT EXISTS leads_score_user_idx ON leads(user_id, score DESC) WHERE deleted_at IS NULL;
