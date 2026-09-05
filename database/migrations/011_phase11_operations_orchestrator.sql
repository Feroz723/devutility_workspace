-- ============================================================================
-- Phase 11: Autonomous Operations & Integration Orchestrator Schema
-- ============================================================================

-- 1. Operations Jobs (Global unified execution table)
CREATE TABLE IF NOT EXISTS operations_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  module VARCHAR(100) NOT NULL, -- RESEARCH, VALIDATION, EXPERIMENTS, PRODUCTS, DISTRIBUTION, SALES, CUSTOMER_SUCCESS, INTELLIGENCE, SYSTEM, ORCHESTRATOR
  action VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED' CHECK (
    status IN (
      'PLANNED', 'QUEUED', 'RUNNING', 'WAITING', 'SUCCEEDED',
      'FAILED', 'RETRYING', 'DEAD_LETTER', 'BLOCKED', 'PAUSED',
      'CANCELLED', 'REQUIRES_APPROVAL', 'REQUIRES_MANUAL_SETUP'
    )
  ),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of job IDs or job names
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Downstream jobs waiting on this
  priority INT NOT NULL DEFAULT 50,              -- 0 (lowest) to 100 (highest)
  retry_policy JSONB NOT NULL DEFAULT '{
    "max_attempts": 3,
    "backoff_base_ms": 1000,
    "backoff_factor": 2,
    "max_backoff_ms": 30000
  }'::jsonb,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  failure_classification VARCHAR(50) CHECK (
    failure_classification IN (
      'TRANSIENT', 'CONFIGURATION', 'AUTHENTICATION', 'RATE_LIMIT',
      'VALIDATION', 'SECURITY', 'BUSINESS_RULE', 'MANUAL_SETUP', 'PERMANENT'
    ) OR failure_classification IS NULL
  ),
  last_error TEXT,
  error_stack TEXT,
  timeout_seconds INT NOT NULL DEFAULT 300,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  required_approval BOOLEAN NOT NULL DEFAULT false,
  approval_id UUID,
  required_integration VARCHAR(100),
  resource_requirement JSONB NOT NULL DEFAULT '{
    "time_weight": 1,
    "compute_weight": 1
  }'::jsonb,
  safety_classification VARCHAR(50) NOT NULL DEFAULT 'ZERO_COST_AUTO' CHECK (
    safety_classification IN ('ZERO_COST_AUTO', 'SENSITIVE_REVIEW', 'FINANCIAL_APPROVAL', 'PROHIBITED')
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_jobs_status ON operations_jobs(status);
CREATE INDEX IF NOT EXISTS idx_operations_jobs_module ON operations_jobs(module);
CREATE INDEX IF NOT EXISTS idx_operations_jobs_priority ON operations_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_operations_jobs_next_run ON operations_jobs(next_run_at) WHERE status = 'QUEUED';
CREATE INDEX IF NOT EXISTS idx_operations_jobs_is_demo ON operations_jobs(is_demo);
CREATE INDEX IF NOT EXISTS idx_operations_jobs_created_at ON operations_jobs(created_at DESC);

-- 2. Operations Job History (Append-only execution attempt timeline)
CREATE TABLE IF NOT EXISTS operations_job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES operations_jobs(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  error TEXT,
  output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_job_history_job ON operations_job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_operations_job_history_created ON operations_job_history(created_at DESC);

-- 3. Operations Events (Unified global event bus)
CREATE TABLE IF NOT EXISTS operations_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  source_module VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  correlation_id VARCHAR(255),
  causation_id VARCHAR(255),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_demo BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_operations_events_type ON operations_events(event_type);
CREATE INDEX IF NOT EXISTS idx_operations_events_module ON operations_events(source_module);
CREATE INDEX IF NOT EXISTS idx_operations_events_correlation ON operations_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_operations_events_timestamp ON operations_events(timestamp DESC);

-- 4. Integration Health Registry (Tracks status of external services & credentials)
CREATE TABLE IF NOT EXISTS integration_health (
  provider VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- DATABASE, AI, RESEARCH, DISTRIBUTION, PAYMENT, EMAIL, AUTOMATION, DEPLOYMENT
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  connection_status VARCHAR(50) NOT NULL DEFAULT 'NOT_CONNECTED' CHECK (
    connection_status IN (
      'NOT_CONNECTED', 'REQUIRES_MANUAL_SETUP', 'CONFIGURED_TEST',
      'CONFIGURED_LIVE', 'HEALTHY', 'DEGRADED', 'FAILED', 'BLOCKED'
    )
  ),
  last_successful_check TIMESTAMPTZ,
  last_failure TIMESTAMPTZ,
  last_error TEXT,
  required_env_vars JSONB NOT NULL DEFAULT '[]'::jsonb,
  manual_setup_instructions TEXT,
  latency_ms INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. System State (Global single-row operational governance)
CREATE TABLE IF NOT EXISTS system_state (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'GLOBAL_SYSTEM_STATE',
  readiness_status VARCHAR(50) NOT NULL DEFAULT 'SYSTEM_PARTIALLY_READY' CHECK (
    readiness_status IN ('SYSTEM_READY', 'SYSTEM_PARTIALLY_READY', 'SYSTEM_NOT_READY', 'SYSTEM_BLOCKED')
  ),
  readiness_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  pause_reason TEXT,
  is_kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  kill_switch_triggered_at TIMESTAMPTZ,
  kill_switch_reason TEXT,
  active_cycle VARCHAR(50) NOT NULL DEFAULT 'IDLE' CHECK (active_cycle IN ('DAILY', 'WEEKLY', 'IDLE')),
  last_daily_cycle_at TIMESTAMPTZ,
  last_weekly_cycle_at TIMESTAMPTZ,
  spending_limit_inr INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Autonomous Agent Registry (Lifecycle & status of all 10 domain agents)
CREATE TABLE IF NOT EXISTS agent_registry (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phase_number INT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'PAUSED', 'DEGRADED', 'FAILED', 'BLOCKED', 'REQUIRES_MANUAL_SETUP')
  ),
  last_execution_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. System Backups (Local zero-cost system state snapshots & exports)
CREATE TABLE IF NOT EXISTS system_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('FULL', 'CONFIG_ONLY', 'AUDIT_ONLY', 'BUSINESS_DATA')),
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  checksum_sha256 VARCHAR(64) NOT NULL,
  includes_secrets BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'FAILED', 'RESTORING', 'RESTORED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_backups_created ON system_backups(created_at DESC);
