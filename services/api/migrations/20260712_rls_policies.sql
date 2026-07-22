-- Row Level Security (RLS) — Supabase direkt erişimine karşı koruma
-- NOT: Backend API her zaman service_role key ile bağlanır → service_role RLS'i bypass eder.
-- Bu politikalar: anon key ile gelen direkt Supabase isteklerini engeller.
-- Supabase Dashboard → SQL Editor'da çalıştırın.

-- ─── LEADS ───────────────────────────────────────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_user_select"  ON leads;
DROP POLICY IF EXISTS "leads_user_insert"  ON leads;
DROP POLICY IF EXISTS "leads_user_update"  ON leads;
DROP POLICY IF EXISTS "leads_user_delete"  ON leads;
DROP POLICY IF EXISTS "leads_service_all"  ON leads;

CREATE POLICY "leads_service_all" ON leads USING (auth.role() = 'service_role');

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_user_select"  ON messages;
DROP POLICY IF EXISTS "messages_user_insert"  ON messages;
DROP POLICY IF EXISTS "messages_user_update"  ON messages;
DROP POLICY IF EXISTS "messages_user_delete"  ON messages;
DROP POLICY IF EXISTS "messages_service_all"  ON messages;

CREATE POLICY "messages_service_all" ON messages USING (auth.role() = 'service_role');

-- ─── WA_INSTANCES ─────────────────────────────────────────────────────────────
ALTER TABLE wa_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_instances_user_select"  ON wa_instances;
DROP POLICY IF EXISTS "wa_instances_user_insert"  ON wa_instances;
DROP POLICY IF EXISTS "wa_instances_user_update"  ON wa_instances;
DROP POLICY IF EXISTS "wa_instances_user_delete"  ON wa_instances;
DROP POLICY IF EXISTS "wa_instances_service_all"  ON wa_instances;

CREATE POLICY "wa_instances_service_all" ON wa_instances USING (auth.role() = 'service_role');

-- ─── CAMPAIGNS ────────────────────────────────────────────────────────────────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_user_select"  ON campaigns;
DROP POLICY IF EXISTS "campaigns_user_insert"  ON campaigns;
DROP POLICY IF EXISTS "campaigns_user_update"  ON campaigns;
DROP POLICY IF EXISTS "campaigns_user_delete"  ON campaigns;
DROP POLICY IF EXISTS "campaigns_service_all"  ON campaigns;

CREATE POLICY "campaigns_service_all" ON campaigns USING (auth.role() = 'service_role');

-- ─── EK: Diğer kritik tablolar ────────────────────────────────────────────────
ALTER TABLE user_replicas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_outreach       ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloned_voices        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_replicas_own" ON user_replicas;
DROP POLICY IF EXISTS "user_replicas_svc" ON user_replicas;
CREATE POLICY "user_replicas_svc" ON user_replicas USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "video_outreach_own" ON video_outreach;
DROP POLICY IF EXISTS "video_outreach_svc" ON video_outreach;
CREATE POLICY "video_outreach_svc" ON video_outreach USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "voice_calls_own" ON voice_calls;
DROP POLICY IF EXISTS "voice_calls_svc" ON voice_calls;
CREATE POLICY "voice_calls_svc" ON voice_calls USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "cloned_voices_own" ON cloned_voices;
DROP POLICY IF EXISTS "cloned_voices_svc" ON cloned_voices;
CREATE POLICY "cloned_voices_svc" ON cloned_voices USING (auth.role() = 'service_role');
