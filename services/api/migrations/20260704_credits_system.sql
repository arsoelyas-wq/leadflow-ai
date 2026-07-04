-- ═══════════════════════════════════════════════════════════════════════════════
-- Sovlo Credit & Subscription System Migration
-- Run at: https://supabase.com/dashboard/project/sivrmewtljftzlwmppub/sql/new
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add new columns to users table ────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credits_rollover        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_renews_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle           TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual'));

-- Set default plan for users without one
UPDATE users SET plan_type = 'trial' WHERE plan_type IS NULL OR plan_type = '';

-- ── 2. credit_transactions table (full history) ───────────────────────────────

CREATE TABLE IF NOT EXISTS credit_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  action       TEXT NOT NULL,
  amount       INTEGER NOT NULL,         -- positive = credit, negative = debit
  description  TEXT,
  balance_after INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ct_user_date
  ON credit_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ct_user_action
  ON credit_transactions(user_id, action);

-- ── 3. Migrate existing credit_logs to credit_transactions ────────────────────

INSERT INTO credit_transactions (user_id, action, amount, description, created_at)
SELECT
  user_id,
  COALESCE(action, 'legacy'),
  -COALESCE(cost, 0),     -- credit_logs stored costs as positive, we use negative for debits
  COALESCE(description, action, 'Eski kayıt'),
  COALESCE(created_at, NOW())
FROM credit_logs
WHERE NOT EXISTS (
  SELECT 1 FROM credit_transactions ct WHERE ct.user_id = credit_logs.user_id
    AND ct.created_at = credit_logs.created_at
    AND ct.action = COALESCE(credit_logs.action, 'legacy')
)
ON CONFLICT DO NOTHING;

-- ── 4. RLS policies ───────────────────────────────────────────────────────────

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON credit_transactions;
CREATE POLICY "Users can read own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access on transactions" ON credit_transactions;
CREATE POLICY "Service role full access on transactions"
  ON credit_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. Helper: refresh user credits for new billing period ───────────────────

CREATE OR REPLACE FUNCTION refresh_user_credits(
  p_user_id        TEXT,
  p_plan_id        TEXT,
  p_monthly_credits INTEGER,
  p_rollover_months INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_unused    INTEGER;
  v_old_roll  INTEGER;
  v_max_roll  INTEGER;
  v_new_roll  INTEGER;
BEGIN
  SELECT
    GREATEST(0, credits_total - credits_used),
    COALESCE(credits_rollover, 0)
  INTO v_unused, v_old_roll
  FROM users WHERE id = p_user_id;

  v_max_roll := p_monthly_credits * p_rollover_months;
  v_new_roll := LEAST(v_unused + v_old_roll, v_max_roll);

  UPDATE users SET
    credits_total         = p_monthly_credits,
    credits_used          = 0,
    credits_rollover      = v_new_roll,
    subscription_renews_at = NOW() + INTERVAL '30 days'
  WHERE id = p_user_id;
END;
$$;

-- ── 6. Indexes for performance ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_plan       ON users(plan_type);
CREATE INDEX IF NOT EXISTS idx_users_stripe_cid ON users(stripe_customer_id);
