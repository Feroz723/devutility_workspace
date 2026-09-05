-- =====================================================
-- Autonomous Business OS — Phase 3 Database Migration
-- =====================================================

-- 1. Opportunities Enhancements
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS research_confidence INTEGER DEFAULT 0 CHECK (research_confidence >= 0 AND research_confidence <= 100),
  ADD COLUMN IF NOT EXISTS evidence_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_researched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS research_run_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS monetization_type TEXT,
  ADD COLUMN IF NOT EXISTS monetization_confidence TEXT CHECK (monetization_confidence IS NULL OR monetization_confidence IN ('EVIDENCE-BACKED', 'INFERRED', 'SPECULATIVE'));

CREATE INDEX IF NOT EXISTS idx_opportunities_confidence ON opportunities(research_confidence DESC NULLS LAST);

-- 2. Opportunity Evidence Enhancements
ALTER TABLE opportunity_evidence
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS source_name TEXT NOT NULL DEFAULT 'Unknown Source',
  ADD COLUMN IF NOT EXISTS evidence_text TEXT,
  ADD COLUMN IF NOT EXISTS evidence_strength TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (evidence_strength IN ('LOW', 'MEDIUM', 'HIGH')),
  ADD COLUMN IF NOT EXISTS evidence_nature TEXT NOT NULL DEFAULT 'DIRECT' CHECK (evidence_nature IN ('DIRECT', 'INFERRED', 'AI_INTERPRETATION')),
  ADD COLUMN IF NOT EXISTS source_quality TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (source_quality IN ('PRIMARY', 'SECONDARY', 'LOWER_CONFIDENCE')),
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Research Runs Enhancements
ALTER TABLE research_runs
  ALTER COLUMN opportunity_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS query TEXT,
  ADD COLUMN IF NOT EXISTS cost_classification TEXT NOT NULL DEFAULT 'FREE' CHECK (cost_classification IN ('FREE', 'REQUIRES_APPROVAL', 'BLOCKED')),
  ADD COLUMN IF NOT EXISTS result_summary JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS opportunities_created INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opportunities_updated INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evidence_collected INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER NOT NULL DEFAULT 0;

-- 4. Research Cache Table
CREATE TABLE IF NOT EXISTS research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_cache_url ON research_cache(url);

-- 5. Research Jobs Table
CREATE TABLE IF NOT EXISTS research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_run_id UUID REFERENCES research_runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  query TEXT,
  provider TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);
