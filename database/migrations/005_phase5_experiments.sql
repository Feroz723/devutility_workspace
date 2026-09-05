-- =====================================================
-- Autonomous Business OS — Phase 5 Database Migration
-- Autonomous ₹0 Experiment Engine
-- =====================================================

-- 1. Extend experiments table with Phase 5 fields
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS experiment_type TEXT DEFAULT 'LANDING_PAGE',
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS solution TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS failure_criteria JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS time_window JSONB DEFAULT '{"duration_days": 7}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_classification TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS human_actions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS automation_actions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS baseline_metrics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hypothesis_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS learning_data JSONB DEFAULT '{}'::jsonb;

-- Ensure status supports all state machine states
-- Existing statuses: 'active', 'paused', 'completed', 'failed', 'stopped'
-- Extended states: 'PROPOSED', 'APPROVED', 'SETUP', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'ANALYZING', 'PROMISING', 'WINNER', 'STOPPED', 'FAILED'

CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(experiment_type);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_cost_class ON experiments(cost_classification);

-- 2. Extend experiment_metrics table
ALTER TABLE experiment_metrics
  ADD COLUMN IF NOT EXISTS metric_type TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MANUAL';

CREATE INDEX IF NOT EXISTS idx_exp_metrics_name ON experiment_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_exp_metrics_recorded_at ON experiment_metrics(recorded_at DESC);

-- 3. Create experiment_jobs table for background/step execution tracking
CREATE TABLE IF NOT EXISTS experiment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exp_jobs_experiment ON experiment_jobs(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_jobs_status ON experiment_jobs(status);

-- 4. Create waitlist_entries table for real waitlist captures
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'organic',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_waitlist_experiment_email UNIQUE(experiment_id, email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_experiment ON waitlist_entries(experiment_id);
