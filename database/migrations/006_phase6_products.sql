-- =====================================================
-- Autonomous Business OS — Phase 6 Database Migration
-- Autonomous Product Builder
-- =====================================================

-- 1. Extend products table with Phase 6 fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS solution TEXT,
  ADD COLUMN IF NOT EXISTS value_proposition TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS build_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS estimated_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_classification TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS build_plan JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tech_stack JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS repository_url TEXT,
  ADD COLUMN IF NOT EXISTS deployment_url TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS learning_data JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_experiment ON products(experiment_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_build_status ON products(build_status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- 2. Create product_build_jobs table
CREATE TABLE IF NOT EXISTS product_build_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  stage TEXT NOT NULL DEFAULT 'PLANNING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_jobs_product ON product_build_jobs(product_id);
CREATE INDEX IF NOT EXISTS idx_build_jobs_status ON product_build_jobs(status);

-- 3. Create product_versions table
CREATE TABLE IF NOT EXISTS product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  spec_hash TEXT,
  build_plan_hash TEXT,
  artifacts_summary JSONB DEFAULT '{}'::jsonb,
  test_results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_version UNIQUE(product_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_product ON product_versions(product_id);

-- 4. Create product_artifacts table
CREATE TABLE IF NOT EXISTS product_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  artifact_type TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_product ON product_artifacts(product_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON product_artifacts(artifact_type);

-- 5. Create product_build_events table
CREATE TABLE IF NOT EXISTS product_build_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_events_product ON product_build_events(product_id);
CREATE INDEX IF NOT EXISTS idx_build_events_type ON product_build_events(event_type);
