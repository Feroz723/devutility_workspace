-- =====================================================================
-- Migration 012: Phase 12 - Autonomous Runtime & Real-World Activation
-- =====================================================================

-- 1. Runtime Instances (Active and past worker processes)
CREATE TABLE IF NOT EXISTS runtime_instances (
  id VARCHAR(64) PRIMARY KEY,
  hostname VARCHAR(255) NOT NULL,
  pid INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'STARTING', -- STARTING, RUNNING, PAUSED, STOPPED, TERMINATED
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  active_jobs_count INT NOT NULL DEFAULT 0,
  processed_jobs_count INT NOT NULL DEFAULT 0,
  failed_jobs_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_runtime_instances_status ON runtime_instances(status);
CREATE INDEX IF NOT EXISTS idx_runtime_instances_heartbeat ON runtime_instances(last_heartbeat_at);

-- 2. Runtime Configuration (Persistent, dynamically reconfigurable settings)
CREATE TABLE IF NOT EXISTS runtime_config (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
  worker_enabled BOOLEAN NOT NULL DEFAULT true,
  scheduler_enabled BOOLEAN NOT NULL DEFAULT true,
  safe_mode BOOLEAN NOT NULL DEFAULT false,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  polling_interval_ms INT NOT NULL DEFAULT 2000,
  max_global_concurrency INT NOT NULL DEFAULT 5,
  max_ai_concurrency INT NOT NULL DEFAULT 1,
  max_research_concurrency INT NOT NULL DEFAULT 2,
  daily_cycle_interval_hours INT NOT NULL DEFAULT 24,
  weekly_cycle_interval_days INT NOT NULL DEFAULT 7,
  stale_job_threshold_minutes INT NOT NULL DEFAULT 15,
  default_retry_limit INT NOT NULL DEFAULT 3,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default global runtime config if not present
INSERT INTO runtime_config (id, worker_enabled, scheduler_enabled, safe_mode, dry_run)
VALUES ('global', true, true, false, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Scheduled Jobs (Persistent scheduling driving recurring and delayed execution)
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  job_type VARCHAR(64) NOT NULL, -- DAILY_CYCLE, WEEKLY_CYCLE, RECURRING_TASK, DELAYED_TASK, RETRY_JOB
  target_module VARCHAR(64) NOT NULL,
  target_action VARCHAR(64) NOT NULL,
  schedule_type VARCHAR(32) NOT NULL, -- CRON, INTERVAL, ONE_TIME, RETRY_AT
  cron_expression VARCHAR(64),
  interval_seconds INT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  total_runs INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED, DISABLED
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(job_type);

-- 4. Execution Cycles (Real daily and weekly end-to-end business execution cycles)
CREATE TABLE IF NOT EXISTS execution_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_type VARCHAR(32) NOT NULL, -- DAILY, WEEKLY, ADHOC
  status VARCHAR(32) NOT NULL DEFAULT 'PLANNED', -- PLANNED, RUNNING, PAUSED, WAITING, COMPLETED, PARTIALLY_COMPLETED, FAILED, CANCELLED
  current_stage VARCHAR(64),
  stages_completed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  stages_failed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  stages_waiting TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  correlation_id VARCHAR(64) NOT NULL,
  is_dry_run BOOLEAN NOT NULL DEFAULT false,
  is_safe_mode BOOLEAN NOT NULL DEFAULT false,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  decisions_generated_count INT NOT NULL DEFAULT 0,
  error_summary TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_cycles_type_status ON execution_cycles(cycle_type, status);
CREATE INDEX IF NOT EXISTS idx_execution_cycles_started ON execution_cycles(started_at DESC);

-- 5. Cycle Stages (Granular stage-level tracking within a business cycle)
CREATE TABLE IF NOT EXISTS cycle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES execution_cycles(id) ON DELETE CASCADE,
  stage_name VARCHAR(64) NOT NULL,
  phase_number INT NOT NULL,
  sequence_order INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PLANNED', -- PLANNED, RUNNING, COMPLETED, FAILED, SKIPPED, WAITING_APPROVAL
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  items_processed INT NOT NULL DEFAULT 0,
  is_recoverable BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycle_stages_cycle_id ON cycle_stages(cycle_id, sequence_order);

-- 6. Runtime Notifications (Persistent in-app operational notification queue)
CREATE TABLE IF NOT EXISTS runtime_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, CRITICAL, EMERGENCY
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  source_module VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(64),
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_notifications_ack ON runtime_notifications(is_acknowledged, created_at DESC);

-- 7. Resource Usage Logs (Telemetry tracking concurrency slots, AI usage, queue latency)
CREATE TABLE IF NOT EXISTS resource_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_workers INT NOT NULL DEFAULT 0,
  active_jobs INT NOT NULL DEFAULT 0,
  queued_jobs INT NOT NULL DEFAULT 0,
  dead_letter_jobs INT NOT NULL DEFAULT 0,
  ai_active_requests INT NOT NULL DEFAULT 0,
  research_active_requests INT NOT NULL DEFAULT 0,
  concurrency_saturation_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  avg_job_duration_ms INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_resource_usage_recorded ON resource_usage_logs(recorded_at DESC);
