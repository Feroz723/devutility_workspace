-- =====================================================
-- Autonomous Business OS — Phase 4 Database Migration
-- Validation Engine & Decision Intelligence
-- =====================================================

-- 1. Opportunities Validation & Priority Enhancements
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS validation_score INTEGER CHECK (validation_score IS NULL OR (validation_score >= 0 AND validation_score <= 100)),
  ADD COLUMN IF NOT EXISTS priority_score INTEGER CHECK (priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100)),
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'UNVALIDATED' CHECK (validation_status IN ('UNVALIDATED', 'RESEARCHING', 'VALIDATED', 'TEST_CANDIDATE', 'REJECTED', 'REQUIRES_APPROVAL')),
  ADD COLUMN IF NOT EXISTS customer_profile JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proposed_solution JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS experiment_proposal JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_opportunities_val_score ON opportunities(validation_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opportunities_val_status ON opportunities(validation_status);

-- 2. Validation Runs Table
CREATE TABLE IF NOT EXISTS validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
  evidence_analyzed INTEGER NOT NULL DEFAULT 0,
  sources_analyzed INTEGER NOT NULL DEFAULT 0,
  validation_score INTEGER CHECK (validation_score IS NULL OR (validation_score >= 0 AND validation_score <= 100)),
  confidence INTEGER CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  decision TEXT NOT NULL CHECK (decision IN ('TEST_CANDIDATE', 'RESEARCH_MORE', 'REJECT', 'REQUIRES_APPROVAL', 'BLOCKED')),
  result JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_val_runs_opportunity ON validation_runs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_val_runs_status ON validation_runs(status);
