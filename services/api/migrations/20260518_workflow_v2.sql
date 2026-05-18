-- Workflow V2 Migration
-- Run in Supabase SQL Editor

-- Visual workflow definitions (node-graph stored as JSONB)
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  name            text NOT NULL,
  description     text,
  trigger_type    text NOT NULL DEFAULT 'manual',
  -- trigger_type: manual | lead_created | stage_changed | score_threshold | email_opened | cron
  trigger_config  jsonb NOT NULL DEFAULT '{}',
  -- For cron: { cron: "0 9 * * 1" }
  -- For stage_changed: { from: "new", to: "contacted" }
  -- For score_threshold: { threshold: 70, direction: "above" }
  nodes           jsonb NOT NULL DEFAULT '[]',
  -- Array of WorkflowNode objects (see workflow-v2.ts for schema)
  is_active       boolean NOT NULL DEFAULT false,
  run_count       integer NOT NULL DEFAULT 0,
  last_run_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wf_def_user" ON workflow_definitions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Per-step execution logs for analytics
CREATE TABLE IF NOT EXISTS workflow_step_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   uuid NOT NULL,
  workflow_def_id uuid NOT NULL,
  lead_id         uuid NOT NULL,
  user_id         uuid NOT NULL,
  node_id         text NOT NULL,
  node_type       text NOT NULL,
  status          text NOT NULL DEFAULT 'executed',
  -- status: executed | skipped | error | waiting
  ab_variant      text,
  channel         text,
  message_sent    text,
  error_msg       text,
  metadata        jsonb DEFAULT '{}',
  executed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wf_log_user" ON workflow_step_logs
  USING (user_id = auth.uid());

-- Extend workflow_enrollments if it exists
DO $$
BEGIN
  -- Add workflow_def_id if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workflow_enrollments' AND column_name='workflow_def_id'
  ) THEN
    ALTER TABLE workflow_enrollments ADD COLUMN workflow_def_id uuid;
  END IF;

  -- current_node_id for visual engine
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workflow_enrollments' AND column_name='current_node_id'
  ) THEN
    ALTER TABLE workflow_enrollments ADD COLUMN current_node_id text;
  END IF;

  -- ab_variant: 'A' or 'B'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workflow_enrollments' AND column_name='ab_variant'
  ) THEN
    ALTER TABLE workflow_enrollments ADD COLUMN ab_variant text;
  END IF;

  -- retry_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workflow_enrollments' AND column_name='retry_count'
  ) THEN
    ALTER TABLE workflow_enrollments ADD COLUMN retry_count integer NOT NULL DEFAULT 0;
  END IF;

  -- variables: per-enrollment key-value store
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workflow_enrollments' AND column_name='variables'
  ) THEN
    ALTER TABLE workflow_enrollments ADD COLUMN variables jsonb DEFAULT '{}';
  END IF;

  -- error_msg for last error
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workflow_enrollments' AND column_name='error_msg'
  ) THEN
    ALTER TABLE workflow_enrollments ADD COLUMN error_msg text;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wf_def_user    ON workflow_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_wf_def_active  ON workflow_definitions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wf_log_enroll  ON workflow_step_logs(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_wf_log_lead    ON workflow_step_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_wf_log_user    ON workflow_step_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_enroll_next    ON workflow_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_enroll_defid   ON workflow_enrollments(workflow_def_id) WHERE workflow_def_id IS NOT NULL;
