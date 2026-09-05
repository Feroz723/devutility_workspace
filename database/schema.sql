-- =====================================================
-- Autonomous Business OS — Phase 2 Database Schema
-- =====================================================
-- All tables use UUID PKs, timestamps, and proper constraints.
-- Execute with: npm run migrate
-- =====================================================

-- Custom types via CHECK constraints (portable across PG/Supabase)

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'viewer')),
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== SYSTEM SETTINGS =====
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== OPPORTUNITIES =====
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  problem TEXT,
  problem_statement TEXT,
  target_customer TEXT,
  target_market TEXT,
  source TEXT,
  source_url TEXT,
  evidence JSONB DEFAULT '[]'::jsonb,
  demand_score INTEGER CHECK (demand_score IS NULL OR (demand_score >= 0 AND demand_score <= 100)),
  competition_score INTEGER CHECK (competition_score IS NULL OR (competition_score >= 0 AND competition_score <= 100)),
  monetization_score INTEGER CHECK (monetization_score IS NULL OR (monetization_score >= 0 AND monetization_score <= 100)),
  automation_score INTEGER CHECK (automation_score IS NULL OR (automation_score >= 0 AND automation_score <= 100)),
  zero_cost_score INTEGER CHECK (zero_cost_score IS NULL OR (zero_cost_score >= 0 AND zero_cost_score <= 100)),
  overall_score INTEGER CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
  decision TEXT CHECK (decision IS NULL OR decision IN ('TEST', 'RESEARCH_MORE', 'REJECT')),
  estimated_revenue TEXT,
  estimated_time_to_test TEXT,
  human_involvement TEXT CHECK (human_involvement IS NULL OR human_involvement IN ('none', 'minimal', 'moderate', 'significant')),
  risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'researching', 'scored', 'testing', 'validated', 'rejected', 'archived')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  research_confidence INTEGER DEFAULT 0 CHECK (research_confidence >= 0 AND research_confidence <= 100),
  evidence_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  last_researched_at TIMESTAMPTZ,
  research_run_count INTEGER NOT NULL DEFAULT 0,
  competitors JSONB DEFAULT '[]'::jsonb,
  monetization_type TEXT,
  monetization_confidence TEXT CHECK (monetization_confidence IS NULL OR monetization_confidence IN ('EVIDENCE-BACKED', 'INFERRED', 'SPECULATIVE')),
  validation_score INTEGER CHECK (validation_score IS NULL OR (validation_score >= 0 AND validation_score <= 100)),
  priority_score INTEGER CHECK (priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100)),
  validation_status TEXT DEFAULT 'UNVALIDATED' CHECK (validation_status IN ('UNVALIDATED', 'RESEARCHING', 'VALIDATED', 'TEST_CANDIDATE', 'REJECTED', 'REQUIRES_APPROVAL')),
  customer_profile JSONB DEFAULT '{}'::jsonb,
  proposed_solution JSONB DEFAULT '{}'::jsonb,
  experiment_proposal JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_overall_score ON opportunities(overall_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opportunities_confidence ON opportunities(research_confidence DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opportunities_val_score ON opportunities(validation_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opportunities_val_status ON opportunities(validation_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_demo ON opportunities(is_demo);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at DESC);

-- ===== VALIDATION RUNS =====
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

-- ===== OPPORTUNITY EVIDENCE =====
CREATE TABLE IF NOT EXISTS opportunity_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('search_trend', 'social_mention', 'competitor', 'market_data', 'user_feedback', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'web',
  source_name TEXT NOT NULL DEFAULT 'Unknown Source',
  evidence_text TEXT,
  evidence_strength TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (evidence_strength IN ('LOW', 'MEDIUM', 'HIGH')),
  evidence_nature TEXT NOT NULL DEFAULT 'DIRECT' CHECK (evidence_nature IN ('DIRECT', 'INFERRED', 'AI_INTERPRETATION')),
  source_quality TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (source_quality IN ('PRIMARY', 'SECONDARY', 'LOWER_CONFIDENCE')),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_opportunity ON opportunity_evidence(opportunity_id);

-- ===== RESEARCH RUNS =====
CREATE TABLE IF NOT EXISTS research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  provider TEXT,
  query TEXT,
  run_type TEXT NOT NULL DEFAULT 'comprehensive' CHECK (run_type IN ('demand', 'competition', 'monetization', 'comprehensive')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  cost_classification TEXT NOT NULL DEFAULT 'FREE' CHECK (cost_classification IN ('FREE', 'REQUIRES_APPROVAL', 'BLOCKED')),
  results JSONB DEFAULT '{}'::jsonb,
  result_summary JSONB DEFAULT '{}'::jsonb,
  opportunities_created INTEGER NOT NULL DEFAULT 0,
  opportunities_updated INTEGER NOT NULL DEFAULT 0,
  evidence_collected INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_opportunity ON research_runs(opportunity_id);

-- ===== RESEARCH CACHE =====
CREATE TABLE IF NOT EXISTS research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_cache_url ON research_cache(url);

-- ===== RESEARCH JOBS =====
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

-- ===== DECISIONS =====
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  decision TEXT NOT NULL CHECK (decision IN ('TEST', 'RESEARCH_MORE', 'REJECT')),
  reasoning TEXT,
  requires_spend BOOLEAN NOT NULL DEFAULT false,
  spend_override_blocked BOOLEAN NOT NULL DEFAULT false,
  decided_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_opportunity ON decisions(opportunity_id);

-- ===== DECISION FACTORS =====
CREATE TABLE IF NOT EXISTS decision_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  factor_name TEXT NOT NULL,
  raw_score INTEGER NOT NULL CHECK (raw_score >= 0 AND raw_score <= 100),
  weight NUMERIC(4,2) NOT NULL,
  weighted_score NUMERIC(6,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_factors_decision ON decision_factors(decision_id);

-- ===== APPROVALS =====
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  reason TEXT,
  estimated_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  expected_benefit TEXT,
  related_opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  related_experiment_id UUID,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  requested_by TEXT NOT NULL DEFAULT 'system',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);

-- ===== EXPERIMENTS =====
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  experiment_type TEXT DEFAULT 'LANDING_PAGE',
  hypothesis TEXT,
  problem TEXT,
  solution TEXT,
  target_customer TEXT,
  channel TEXT,
  success_criteria TEXT,
  failure_criteria JSONB DEFAULT '[]'::jsonb,
  time_window JSONB DEFAULT '{"duration_days": 7}'::jsonb,
  estimated_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_classification TEXT NOT NULL DEFAULT 'FREE',
  human_actions JSONB DEFAULT '[]'::jsonb,
  automation_actions JSONB DEFAULT '[]'::jsonb,
  baseline_metrics JSONB DEFAULT '{}'::jsonb,
  hypothesis_details JSONB DEFAULT '{}'::jsonb,
  learning_data JSONB DEFAULT '{}'::jsonb,
  stage TEXT NOT NULL DEFAULT 'DISCOVERY' CHECK (stage IN (
    'DISCOVERY', 'RESEARCH', 'VALIDATION', 'BUILD', 'LAUNCH',
    'DISTRIBUTION', 'RESULTS', 'IMPROVE', 'STOP'
  )),
  status TEXT NOT NULL DEFAULT 'PROPOSED',
  result TEXT,
  decision TEXT,
  start_date DATE,
  end_date DATE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiments_opportunity ON experiments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(experiment_type);
CREATE INDEX IF NOT EXISTS idx_experiments_is_demo ON experiments(is_demo);

-- ===== EXPERIMENT METRICS =====
CREATE TABLE IF NOT EXISTS experiment_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_type TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  unit TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exp_metrics_experiment ON experiment_metrics(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_metrics_name ON experiment_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_exp_metrics_recorded_at ON experiment_metrics(recorded_at DESC);

-- ===== EXPERIMENT JOBS =====
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

-- ===== WAITLIST ENTRIES =====
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


-- ===== PRODUCTS =====
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  product_type TEXT NOT NULL,
  target_customer TEXT,
  problem TEXT,
  solution TEXT,
  value_proposition TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  build_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  creation_status TEXT NOT NULL DEFAULT 'idea',
  publishing_status TEXT NOT NULL DEFAULT 'draft',
  estimated_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_classification TEXT NOT NULL DEFAULT 'FREE',
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  sales_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_method TEXT,
  product_url TEXT,
  repository_url TEXT,
  deployment_url TEXT,
  build_plan JSONB DEFAULT '{}'::jsonb,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  learning_data JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_opportunity ON products(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_products_experiment ON products(experiment_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_build_status ON products(build_status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_demo ON products(is_demo);

-- ===== PRODUCT BUILD JOBS =====
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

-- ===== PRODUCT VERSIONS =====
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

-- ===== PRODUCT ARTIFACTS =====
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

-- ===== PRODUCT BUILD EVENTS =====
CREATE TABLE IF NOT EXISTS product_build_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_events_product ON product_build_events(product_id);
CREATE INDEX IF NOT EXISTS idx_build_events_type ON product_build_events(event_type);

-- ===== DISTRIBUTION CHANNELS =====
CREATE TABLE IF NOT EXISTS distribution_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'disabled')),
  config JSONB DEFAULT '{}'::jsonb,
  connection_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED' CHECK (connection_status IN ('NOT_CONNECTED', 'CONNECTED', 'EXPIRED', 'FAILED', 'DISABLED')),
  automation_capability TEXT NOT NULL DEFAULT 'MANUAL' CHECK (automation_capability IN ('FULL_AUTO', 'ASSISTED', 'MANUAL', 'NOT_SUPPORTED')),
  credentials_required BOOLEAN NOT NULL DEFAULT true,
  manual_setup_required BOOLEAN NOT NULL DEFAULT true,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_action_limit INTEGER NOT NULL DEFAULT 5,
  hourly_action_limit INTEGER NOT NULL DEFAULT 2,
  policy_constraints JSONB DEFAULT '{}'::jsonb,
  supported_content_types JSONB DEFAULT '[]'::jsonb,
  connection_details JSONB DEFAULT '{}'::jsonb,
  last_connection_test_at TIMESTAMPTZ,
  last_connection_error TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_channels_platform ON distribution_channels(platform);
CREATE INDEX IF NOT EXISTS idx_dist_channels_conn_status ON distribution_channels(connection_status);
CREATE INDEX IF NOT EXISTS idx_dist_channels_is_demo ON distribution_channels(is_demo);

-- ===== DISTRIBUTION STRATEGIES =====
CREATE TABLE IF NOT EXISTS distribution_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_audience TEXT NOT NULL,
  value_hook TEXT NOT NULL,
  ranked_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  frequency_rules JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_strat_product ON distribution_strategies(product_id);
CREATE INDEX IF NOT EXISTS idx_dist_strat_is_demo ON distribution_strategies(is_demo);

-- ===== DISTRIBUTION CAMPAIGNS =====
CREATE TABLE IF NOT EXISTS distribution_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES distribution_strategies(id) ON DELETE SET NULL,
  primary_channel_id UUID REFERENCES distribution_channels(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'READY', 'APPROVED', 'RUNNING', 'PAUSED', 'COMPLETED',
    'ANALYZING', 'WINNER', 'PROMISING', 'ITERATE', 'STOPPED', 'FAILED'
  )),
  budget_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_spend_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_metrics JSONB DEFAULT '{}'::jsonb,
  actual_metrics JSONB DEFAULT '{}'::jsonb,
  learnings JSONB DEFAULT '{}'::jsonb,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_camp_product ON distribution_campaigns(product_id);
CREATE INDEX IF NOT EXISTS idx_dist_camp_status ON distribution_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_dist_camp_slug ON distribution_campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_dist_camp_is_demo ON distribution_campaigns(is_demo);

-- ===== DISTRIBUTION ASSETS =====
CREATE TABLE IF NOT EXISTS distribution_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  fact_claims JSONB DEFAULT '[]'::jsonb,
  inference_notes JSONB DEFAULT '[]'::jsonb,
  marketing_copy JSONB DEFAULT '[]'::jsonb,
  approval_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (approval_status IN (
    'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
  )),
  tracking_url TEXT,
  canonical_url TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_assets_product ON distribution_assets(product_id);
CREATE INDEX IF NOT EXISTS idx_dist_assets_campaign ON distribution_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_assets_type ON distribution_assets(channel_type, content_type);
CREATE INDEX IF NOT EXISTS idx_dist_assets_approval ON distribution_assets(approval_status);

-- ===== DISTRIBUTION QUEUE =====
CREATE TABLE IF NOT EXISTS distribution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES distribution_channels(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES distribution_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED',
    'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'BLOCKED',
    'REQUIRES_MANUAL_ACTION'
  )),
  priority INTEGER NOT NULL DEFAULT 5,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  idempotency_key TEXT NOT NULL UNIQUE,
  error_message TEXT,
  manual_action_required TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_queue_campaign ON distribution_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_queue_channel ON distribution_queue(channel_id);
CREATE INDEX IF NOT EXISTS idx_dist_queue_status ON distribution_queue(status);
CREATE INDEX IF NOT EXISTS idx_dist_queue_idempotency ON distribution_queue(idempotency_key);

-- ===== DISTRIBUTION PUBLICATIONS =====
CREATE TABLE IF NOT EXISTS distribution_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES distribution_queue(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES distribution_channels(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES distribution_assets(id) ON DELETE CASCADE,
  external_publication_id TEXT,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'REMOVED', 'FLAGGED')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_pubs_campaign ON distribution_publications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_pubs_channel ON distribution_publications(channel_id);

-- ===== DISTRIBUTION METRICS =====
CREATE TABLE IF NOT EXISTS distribution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID REFERENCES distribution_publications(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES distribution_channels(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'WEBSITE', 'ANALYTICS', 'API', 'IMPORT')),
  confidence INTEGER NOT NULL DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_metrics_campaign ON distribution_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_metrics_channel ON distribution_metrics(channel_id);
CREATE INDEX IF NOT EXISTS idx_dist_metrics_name ON distribution_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_dist_metrics_is_demo ON distribution_metrics(is_demo);

-- ===== DISTRIBUTION LEADS =====
CREATE TABLE IF NOT EXISTS distribution_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES distribution_channels(id) ON DELETE SET NULL,
  publication_id UUID REFERENCES distribution_publications(id) ON DELETE SET NULL,
  email TEXT,
  name TEXT,
  company TEXT,
  source TEXT NOT NULL,
  qualification_score INTEGER NOT NULL DEFAULT 50 CHECK (qualification_score >= 0 AND qualification_score <= 100),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN (
    'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'UNSUBSCRIBED', 'REJECTED'
  )),
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_leads_campaign ON distribution_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_leads_status ON distribution_leads(status);
CREATE INDEX IF NOT EXISTS idx_dist_leads_is_demo ON distribution_leads(is_demo);

-- ===== DISTRIBUTION ATTRIBUTION =====
CREATE TABLE IF NOT EXISTS distribution_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_token TEXT NOT NULL UNIQUE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES distribution_channels(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES distribution_assets(id) ON DELETE CASCADE,
  publication_id UUID REFERENCES distribution_publications(id) ON DELETE SET NULL,
  visits_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  signups_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_attr_token ON distribution_attribution(tracking_token);
CREATE INDEX IF NOT EXISTS idx_dist_attr_campaign ON distribution_attribution(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_attr_is_demo ON distribution_attribution(is_demo);

-- ===== DISTRIBUTION JOBS =====
CREATE TABLE IF NOT EXISTS distribution_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN (
    'PLANNING', 'ASSET_GENERATION', 'PUBLICATION', 'METRIC_COLLECTION', 'ANALYSIS', 'OPTIMIZATION'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_jobs_campaign ON distribution_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_jobs_status ON distribution_jobs(status);

-- ===== DISTRIBUTION EVENTS =====
CREATE TABLE IF NOT EXISTS distribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES distribution_jobs(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_events_campaign ON distribution_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dist_events_type ON distribution_events(event_type);

-- ===== DISTRIBUTION RUNS (LEGACY) =====
CREATE TABLE IF NOT EXISTS distribution_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES distribution_channels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dist_runs_channel ON distribution_runs(channel_id);
CREATE INDEX IF NOT EXISTS idx_dist_runs_product ON distribution_runs(product_id);


-- ===== AUTOMATION WORKFLOWS =====
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('n8n', 'internal', 'cron', 'webhook')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'schedule', 'event', 'webhook')),
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'enabled', 'running', 'failed')),
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== AUTOMATION RUNS =====
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_runs_workflow ON automation_runs(workflow_id);

-- ===== SALES =====
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  amount_inr NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  external_id TEXT UNIQUE,
  customer_email TEXT,
  payment_provider TEXT,
  raw JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_is_demo ON sales(is_demo);

-- ===== AUDIT LOGS (APPEND-ONLY) =====
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'OPPORTUNITY_CREATED', 'OPPORTUNITY_UPDATED', 'OPPORTUNITY_DELETED', 'OPPORTUNITY_SCORED',
    'DECISION_CREATED',
    'APPROVAL_REQUESTED', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED',
    'ACTION_BLOCKED',
    'EXPERIMENT_CREATED', 'EXPERIMENT_UPDATED',
    'PRODUCT_CREATED',
    'AUTOMATION_STARTED', 'AUTOMATION_COMPLETED', 'AUTOMATION_FAILED'
  )),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor TEXT NOT NULL DEFAULT 'system',
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);

-- ===== FOREIGN KEY for experiments in approvals =====
-- Added after experiments table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_approvals_experiment'
  ) THEN
    ALTER TABLE approvals
      ADD CONSTRAINT fk_approvals_experiment
      FOREIGN KEY (related_experiment_id) REFERENCES experiments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- PHASE 8: SALES, CHECKOUT & DELIVERY ENGINE
-- =====================================================

-- 1. Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL,
  target_customer TEXT,
  value_proposition TEXT NOT NULL,
  pricing_model TEXT NOT NULL DEFAULT 'FREE' CHECK (pricing_model IN ('FREE', 'ONE_TIME', 'SUBSCRIPTION', 'PAY_WHAT_YOU_WANT')),
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_period TEXT CHECK (billing_period IN ('MONTHLY', 'YEARLY', 'LIFETIME', 'ONE_OFF')),
  trial_period_days INTEGER NOT NULL DEFAULT 0,
  guarantee_terms TEXT,
  delivery_method TEXT NOT NULL DEFAULT 'DIGITAL_DOWNLOAD' CHECK (delivery_method IN (
    'DIGITAL_DOWNLOAD', 'PRODUCT_ACCESS', 'LICENSE_KEY', 'EMAIL_DELIVERY', 'MANUAL_DELIVERY', 'LINK_DELIVERY', 'ACCOUNT_ACCESS'
  )),
  refund_policy TEXT NOT NULL DEFAULT 'STANDARD_14_DAYS',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'LIVE', 'PAUSED', 'ARCHIVED')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_product ON offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_is_demo ON offers(is_demo);
CREATE INDEX IF NOT EXISTS idx_offers_slug ON offers(slug);

-- 2. Offer Prices (Multi-currency support)
CREATE TABLE IF NOT EXISTS offer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'RECOMMENDED_PRICE' CHECK (classification IN ('VALIDATED_PRICE', 'RECOMMENDED_PRICE', 'HUMAN_DEFINED_PRICE')),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_prices_offer ON offer_prices(offer_id);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  provider_customer_ids JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'LEAD' CHECK (status IN ('LEAD', 'CUSTOMER', 'ACTIVE', 'INACTIVE', 'REFUNDED', 'BLOCKED')),
  source TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_is_demo ON customers(is_demo);

-- 4. Checkout Sessions
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'MANUAL_PAYMENT' CHECK (provider IN ('STRIPE', 'RAZORPAY', 'PAYPAL', 'MANUAL_PAYMENT')),
  provider_session_id TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
    'CREATED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'
  )),
  expires_at TIMESTAMPTZ NOT NULL,
  attribution JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_offer ON checkout_sessions(offer_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_is_demo ON checkout_sessions(is_demo);

-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  fulfillment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (fulfillment_status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PAYMENT_PENDING', 'PAID', 'FULFILLING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED'
  )),
  attribution JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_offer ON orders(offer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_is_demo ON orders(is_demo);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 7. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE', 'RAZORPAY', 'PAYPAL', 'MANUAL_PAYMENT')),
  external_id TEXT UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_external ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_is_demo ON payments(is_demo);

-- 8. Payment Events (Append-only immutable audit of webhooks)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON payment_events(event_id);

-- 9. Customer Entitlements
CREATE TABLE IF NOT EXISTS customer_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING')),
  access_data JSONB DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_customer ON customer_entitlements(customer_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_product ON customer_entitlements(product_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON customer_entitlements(status);

-- 10. Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN (
    'DIGITAL_DOWNLOAD', 'PRODUCT_ACCESS', 'LICENSE_KEY', 'EMAIL_DELIVERY', 'MANUAL_DELIVERY', 'LINK_DELIVERY', 'ACCOUNT_ACCESS'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'RETRYING')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  delivery_payload JSONB DEFAULT '{}'::jsonb,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- 11. Delivery Items
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES product_artifacts(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  download_url TEXT,
  secure_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);

-- 12. Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
    'REQUESTED', 'APPROVED', 'PROCESSING', 'REFUNDED', 'FAILED', 'REJECTED'
  )),
  external_refund_id TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);

-- 13. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE', 'RAZORPAY', 'PAYPAL', 'MANUAL_PAYMENT')),
  external_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'PAUSED')),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('MONTHLY', 'YEARLY')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 14. Sales Metrics
CREATE TABLE IF NOT EXISTS sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  dimensions JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_metrics_offer ON sales_metrics(offer_id);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_name ON sales_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_is_demo ON sales_metrics(is_demo);

-- 15. Sales Attribution
CREATE TABLE IF NOT EXISTS sales_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL,
  channel_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_attribution_order ON sales_attribution(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_attribution_campaign ON sales_attribution(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sales_attribution_is_demo ON sales_attribution(is_demo);

-- 16. Sales Jobs
CREATE TABLE IF NOT EXISTS sales_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN (
    'OFFER_PREPARATION', 'CHECKOUT_CLEANUP', 'WEBHOOK_PROCESSING', 'DELIVERY_RETRY', 'CUSTOMER_ACTIVATION', 'METRICS_COLLECTION', 'REFUND_SYNC', 'SUBSCRIPTION_SYNC', 'ANALYSIS'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  payload JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_jobs_status ON sales_jobs(status);

-- 17. Sales Events (Timeline step events for audit)
CREATE TABLE IF NOT EXISTS sales_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES sales_jobs(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_events_order ON sales_events(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_job ON sales_events(job_id);

-- ============================================================
-- PHASE 9: AUTONOMOUS CUSTOMER SUCCESS, ACTIVATION & RETENTION
-- ============================================================

-- 1. Customer Profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  journey_stage VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  communication_opt_in BOOLEAN NOT NULL DEFAULT true,
  daily_message_limit INT NOT NULL DEFAULT 2,
  weekly_message_limit INT NOT NULL DEFAULT 5,
  preferred_channel VARCHAR(50) NOT NULL DEFAULT 'EMAIL',
  timezone VARCHAR(100) DEFAULT 'UTC',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_profiles_customer_id UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_stage ON customer_profiles(journey_stage);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_demo ON customer_profiles(is_demo);

-- 2. Customer Sessions
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  session_token VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT DEFAULT 0,
  page_views_count INT DEFAULT 0,
  actions_count INT DEFAULT 0,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  ip_address_hash VARCHAR(100),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_product ON customer_sessions(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(session_token);

-- 3. Customer Events
CREATE TABLE IF NOT EXISTS customer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  session_id UUID REFERENCES customer_sessions(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(150) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  source VARCHAR(50) NOT NULL DEFAULT 'IN_APP',
  confidence INT NOT NULL DEFAULT 100,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_events_customer ON customer_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_type ON customer_events(event_type);
CREATE INDEX IF NOT EXISTS idx_customer_events_created ON customer_events(created_at);

-- 4. Customer Activations
CREATE TABLE IF NOT EXISTS customer_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
  activation_started_at TIMESTAMPTZ,
  activation_completed_at TIMESTAMPTZ,
  time_to_value_seconds INT,
  first_action_name VARCHAR(150),
  first_value_name VARCHAR(150),
  milestones_total INT NOT NULL DEFAULT 0,
  milestones_completed INT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_activations_customer_prod UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_activations_status ON customer_activations(status);

-- 5. Customer Goals
CREATE TABLE IF NOT EXISTS customer_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  expected_outcome TEXT,
  completion_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  progress_percent INT NOT NULL DEFAULT 0,
  target_date TIMESTAMPTZ,
  achieved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_goals_customer ON customer_goals(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_goals_status ON customer_goals(completion_status);

-- 6. Customer Milestones
CREATE TABLE IF NOT EXISTS customer_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES customer_goals(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  sequence_order INT NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_milestones_goal ON customer_milestones(goal_id);

-- 7. Customer Health
CREATE TABLE IF NOT EXISTS customer_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  health_score INT NOT NULL DEFAULT 50,
  status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  recency_score INT NOT NULL DEFAULT 50,
  frequency_score INT NOT NULL DEFAULT 50,
  activation_score INT NOT NULL DEFAULT 50,
  support_score INT NOT NULL DEFAULT 50,
  factors JSONB NOT NULL DEFAULT '{}',
  signals JSONB NOT NULL DEFAULT '[]',
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_health_customer UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_health_status ON customer_health(status);
CREATE INDEX IF NOT EXISTS idx_customer_health_score ON customer_health(health_score);

-- 8. Customer Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  feedback_type VARCHAR(50) NOT NULL DEFAULT 'SATISFACTION',
  score INT,
  comment TEXT,
  topic VARCHAR(100),
  sentiment VARCHAR(50) DEFAULT 'NEUTRAL',
  source VARCHAR(50) NOT NULL DEFAULT 'IN_APP',
  confidence INT NOT NULL DEFAULT 100,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_product ON customer_feedback(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(feedback_type);

-- 9. Customer Support Requests
CREATE TABLE IF NOT EXISTS customer_support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'USAGE',
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  assigned_to VARCHAR(100),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_time_seconds INT,
  ai_suggested_category VARCHAR(50),
  ai_suggested_response TEXT,
  ai_confidence INT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_support_status ON customer_support_requests(status);
CREATE INDEX IF NOT EXISTS idx_customer_support_severity ON customer_support_requests(severity);
CREATE INDEX IF NOT EXISTS idx_customer_support_customer ON customer_support_requests(customer_id);

-- 10. Customer Support Messages
CREATE TABLE IF NOT EXISTS customer_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id UUID NOT NULL REFERENCES customer_support_requests(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL,
  sender_name VARCHAR(150),
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_support_messages_req ON customer_support_messages(support_request_id);

-- 11. Customer Interventions
CREATE TABLE IF NOT EXISTS customer_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  intervention_type VARCHAR(50) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  recommended_action TEXT NOT NULL,
  urgency VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  channel VARCHAR(50) NOT NULL DEFAULT 'EMAIL',
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(100),
  executed_at TIMESTAMPTZ,
  execution_result JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_interventions_status ON customer_interventions(status);
CREATE INDEX IF NOT EXISTS idx_customer_interventions_customer ON customer_interventions(customer_id);

-- 12. Customer Onboarding
CREATE TABLE IF NOT EXISTS customer_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  steps JSONB NOT NULL DEFAULT '[]',
  current_step_index INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_onboarding_customer_prod UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_onboarding_completed ON customer_onboarding(is_completed);

-- 13. Customer Retention
CREATE TABLE IF NOT EXISTS customer_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_date DATE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  cohort_size INT NOT NULL DEFAULT 0,
  day_1_retained INT NOT NULL DEFAULT 0,
  day_7_retained INT NOT NULL DEFAULT 0,
  day_14_retained INT NOT NULL DEFAULT 0,
  day_30_retained INT NOT NULL DEFAULT 0,
  weekly_active_customers INT NOT NULL DEFAULT 0,
  monthly_active_customers INT NOT NULL DEFAULT 0,
  repeat_usage_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  has_sufficient_data BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_retention_cohort_prod UNIQUE (cohort_date, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_retention_cohort ON customer_retention(cohort_date);

-- 14. Customer Churn
CREATE TABLE IF NOT EXISTS customer_churn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  churn_status VARCHAR(50) NOT NULL DEFAULT 'CHURN_RISK',
  risk_score INT NOT NULL DEFAULT 50,
  primary_reason VARCHAR(100),
  signals JSONB NOT NULL DEFAULT '[]',
  confirmed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_churn_customer_prod UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_churn_status ON customer_churn(churn_status);

-- 15. Customer Success Jobs
CREATE TABLE IF NOT EXISTS customer_success_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_success_jobs_status ON customer_success_jobs(status);

-- 16. Customer Success Events
CREATE TABLE IF NOT EXISTS customer_success_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_success_events_type ON customer_success_events(event_type);

-- ============================================================
-- PHASE 10: AUTONOMOUS BUSINESS INTELLIGENCE & PORTFOLIO ENGINE
-- ============================================================

-- 1. Business Snapshots
CREATE TABLE IF NOT EXISTS business_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  active_opportunities_count INT NOT NULL DEFAULT 0,
  active_experiments_count INT NOT NULL DEFAULT 0,
  active_products_count INT NOT NULL DEFAULT 0,
  active_campaigns_count INT NOT NULL DEFAULT 0,
  total_visitors_count INT NOT NULL DEFAULT 0,
  total_leads_count INT NOT NULL DEFAULT 0,
  total_signups_count INT NOT NULL DEFAULT 0,
  total_customers_count INT NOT NULL DEFAULT 0,
  activated_customers_count INT NOT NULL DEFAULT 0,
  total_revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_refunds_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  active_retention_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  confirmed_churn_count INT NOT NULL DEFAULT 0,
  open_support_tickets_count INT NOT NULL DEFAULT 0,
  summary_metrics JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_business_snapshots_date_demo UNIQUE (snapshot_date, is_demo)
);

CREATE INDEX IF NOT EXISTS idx_business_snapshots_date ON business_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_snapshots_demo ON business_snapshots(is_demo);

-- 2. Business Metrics
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
  metric_value NUMERIC(12,4),
  metric_unit VARCHAR(50),
  has_sufficient_data BOOLEAN NOT NULL DEFAULT false,
  sample_size INT NOT NULL DEFAULT 0,
  confidence VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  source_phase VARCHAR(50) NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_metrics_name ON business_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_business_metrics_category ON business_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_business_metrics_recorded ON business_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_demo ON business_metrics(is_demo);

-- 3. Unit Economics
CREATE TABLE IF NOT EXISTS unit_economics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_status VARCHAR(50) NOT NULL DEFAULT 'RECORDED_ZERO_COST',
  gross_margin_percent NUMERIC(5,2),
  customer_acquisition_cost_inr NUMERIC(12,2),
  customer_lifetime_value_inr NUMERIC(12,2),
  payback_period_days NUMERIC(8,2),
  revenue_per_user_inr NUMERIC(12,2),
  confidence VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  has_sufficient_data BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_economics_product ON unit_economics(product_id);
CREATE INDEX IF NOT EXISTS idx_unit_economics_cost_status ON unit_economics(cost_status);
CREATE INDEX IF NOT EXISTS idx_unit_economics_demo ON unit_economics(is_demo);

-- 4. Product Performance
CREATE TABLE IF NOT EXISTS product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  performance_tier VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  traffic_count INT NOT NULL DEFAULT 0,
  users_count INT NOT NULL DEFAULT 0,
  customers_count INT NOT NULL DEFAULT 0,
  activation_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  retention_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  churn_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  support_burden_score INT NOT NULL DEFAULT 0,
  feature_requests_count INT NOT NULL DEFAULT 0,
  customer_outcomes_score INT NOT NULL DEFAULT 0,
  evaluation_summary TEXT,
  evidence JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_performance_product UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_performance_tier ON product_performance(performance_tier);
CREATE INDEX IF NOT EXISTS idx_product_performance_demo ON product_performance(is_demo);

-- 5. Channel Performance
CREATE TABLE IF NOT EXISTS channel_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type VARCHAR(50) NOT NULL,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL,
  performance_tier VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  traffic_count INT NOT NULL DEFAULT 0,
  qualified_leads_count INT NOT NULL DEFAULT 0,
  signups_count INT NOT NULL DEFAULT 0,
  customers_count INT NOT NULL DEFAULT 0,
  revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversion_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  effort_score INT NOT NULL DEFAULT 5,
  cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  retention_quality_score INT NOT NULL DEFAULT 50,
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_channel_performance_channel_campaign UNIQUE (channel_type, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_performance_tier ON channel_performance(performance_tier);
CREATE INDEX IF NOT EXISTS idx_channel_performance_type ON channel_performance(channel_type);
CREATE INDEX IF NOT EXISTS idx_channel_performance_demo ON channel_performance(is_demo);

-- 6. Offer Performance
CREATE TABLE IF NOT EXISTS offer_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  performance_tier VARCHAR(50) NOT NULL DEFAULT 'PROMISING',
  views_count INT NOT NULL DEFAULT 0,
  checkouts_started_count INT NOT NULL DEFAULT 0,
  payments_completed_count INT NOT NULL DEFAULT 0,
  conversion_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  refunds_count INT NOT NULL DEFAULT 0,
  refund_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  average_order_value_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  repeat_purchases_count INT NOT NULL DEFAULT 0,
  recommendations TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_offer_performance_offer UNIQUE (offer_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_performance_tier ON offer_performance(performance_tier);
CREATE INDEX IF NOT EXISTS idx_offer_performance_demo ON offer_performance(is_demo);

-- 7. Customer Cohorts
CREATE TABLE IF NOT EXISTS customer_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_name VARCHAR(150) NOT NULL,
  cohort_type VARCHAR(50) NOT NULL,
  dimension_value VARCHAR(150) NOT NULL,
  cohort_size INT NOT NULL DEFAULT 0,
  activated_count INT NOT NULL DEFAULT 0,
  retained_30d_count INT NOT NULL DEFAULT 0,
  churned_count INT NOT NULL DEFAULT 0,
  total_revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  support_tickets_count INT NOT NULL DEFAULT 0,
  has_sufficient_data BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_cohorts_type ON customer_cohorts(cohort_type);
CREATE INDEX IF NOT EXISTS idx_customer_cohorts_demo ON customer_cohorts(is_demo);

-- 8. Portfolio Decisions
CREATE TABLE IF NOT EXISTS portfolio_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type VARCHAR(50) NOT NULL,
  subject_id UUID,
  subject_name VARCHAR(255) NOT NULL,
  decision VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  reasons TEXT[] NOT NULL DEFAULT '{}',
  metrics_summary JSONB NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  recommended_next_action TEXT NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  execution_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  execution_result JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_decisions_subject ON portfolio_decisions(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_decisions_decision ON portfolio_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_portfolio_decisions_status ON portfolio_decisions(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_decisions_demo ON portfolio_decisions(is_demo);

-- 9. Decision Recommendations
CREATE TABLE IF NOT EXISTS decision_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES portfolio_decisions(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  expected_impact TEXT,
  effort_estimate VARCHAR(50) NOT NULL DEFAULT 'LOW',
  cost_estimate_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_recs_decision ON decision_recommendations(decision_id);

-- 10. Decision Evidence
CREATE TABLE IF NOT EXISTS decision_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES portfolio_decisions(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value VARCHAR(100) NOT NULL,
  sample_size INT NOT NULL DEFAULT 1,
  source_reference VARCHAR(255),
  confidence INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_evidence_decision ON decision_evidence(decision_id);

-- 11. Business Forecasts
CREATE TABLE IF NOT EXISTS business_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_type VARCHAR(50) NOT NULL,
  target_metric VARCHAR(100) NOT NULL,
  forecast_value NUMERIC(12,2),
  projected_change_percent NUMERIC(6,2),
  confidence VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  data_window_days INT NOT NULL DEFAULT 30,
  assumptions TEXT[] NOT NULL DEFAULT '{}',
  has_sufficient_data BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_forecasts_type ON business_forecasts(forecast_type);
CREATE INDEX IF NOT EXISTS idx_business_forecasts_demo ON business_forecasts(is_demo);

-- 12. Resource Allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  allocation_percentage INT NOT NULL DEFAULT 20,
  time_hours_per_week NUMERIC(5,1) NOT NULL DEFAULT 0,
  compute_capacity_level VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  attention_priority INT NOT NULL DEFAULT 1,
  justification TEXT NOT NULL,
  cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_allocations_category ON resource_allocations(category);

-- 13. Business Goals
CREATE TABLE IF NOT EXISTS business_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  target_value NUMERIC(12,2) NOT NULL,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'CUSTOMERS',
  deadline TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_goals_status ON business_goals(status);

-- 14. Business Risks
CREATE TABLE IF NOT EXISTS business_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  probability VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  evidence TEXT,
  mitigation TEXT NOT NULL,
  owner VARCHAR(100) NOT NULL DEFAULT 'system',
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_risks_category ON business_risks(category);
CREATE INDEX IF NOT EXISTS idx_business_risks_status ON business_risks(status);
CREATE INDEX IF NOT EXISTS idx_business_risks_severity ON business_risks(severity);

-- 15. Business Learning
CREATE TABLE IF NOT EXISTS business_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_phase VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  why TEXT NOT NULL,
  evidence TEXT NOT NULL,
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  recommended_action TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_learning_category ON business_learning(category);
CREATE INDEX IF NOT EXISTS idx_business_learning_source ON business_learning(source_phase);

-- 16. Business Jobs
CREATE TABLE IF NOT EXISTS business_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_jobs_status ON business_jobs(status);
CREATE INDEX IF NOT EXISTS idx_business_jobs_type ON business_jobs(job_type);

-- 17. Business Events
CREATE TABLE IF NOT EXISTS business_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_events_type ON business_events(event_type);
CREATE INDEX IF NOT EXISTS idx_business_events_entity ON business_events(entity_type, entity_id);

-- ============================================================================
-- Phase 11: Autonomous Operations & Integration Orchestrator Schema
-- ============================================================================

-- 1. Operations Jobs (Global unified execution table)
CREATE TABLE IF NOT EXISTS operations_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED' CHECK (
    status IN (
      'PLANNED', 'QUEUED', 'RUNNING', 'WAITING', 'SUCCEEDED',
      'FAILED', 'RETRYING', 'DEAD_LETTER', 'BLOCKED', 'PAUSED',
      'CANCELLED', 'REQUIRES_APPROVAL', 'REQUIRES_MANUAL_SETUP'
    )
  ),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority INT NOT NULL DEFAULT 50,
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

-- 2. Operations Job History
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

-- 3. Operations Events
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

-- 4. Integration Health Registry
CREATE TABLE IF NOT EXISTS integration_health (
  provider VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
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

-- 5. System State
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

-- 6. Autonomous Agent Registry
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

-- 7. System Backups
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

-- =====================================================================
-- PHASE 12: AUTONOMOUS RUNTIME & REAL-WORLD ACTIVATION
-- =====================================================================

-- 1. Runtime Instances
CREATE TABLE IF NOT EXISTS runtime_instances (
  id VARCHAR(64) PRIMARY KEY,
  hostname VARCHAR(255) NOT NULL,
  pid INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'STARTING',
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

-- 2. Runtime Configuration
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

-- 3. Scheduled Jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  job_type VARCHAR(64) NOT NULL,
  target_module VARCHAR(64) NOT NULL,
  target_action VARCHAR(64) NOT NULL,
  schedule_type VARCHAR(32) NOT NULL,
  cron_expression VARCHAR(64),
  interval_seconds INT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  total_runs INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(job_type);

-- 4. Execution Cycles
CREATE TABLE IF NOT EXISTS execution_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
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

-- 5. Cycle Stages
CREATE TABLE IF NOT EXISTS cycle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES execution_cycles(id) ON DELETE CASCADE,
  stage_name VARCHAR(64) NOT NULL,
  phase_number INT NOT NULL,
  sequence_order INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
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

-- 6. Runtime Notifications
CREATE TABLE IF NOT EXISTS runtime_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'INFO',
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

-- 7. Resource Usage Logs
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

-- ============================================================================
-- PHASE 13: DATA-DRIVEN STRATEGY & EVIDENCE-BASED BUSINESS GOVERNOR
-- ============================================================================

-- 1. Strategic States (Global Primary Focus & Active Operating Direction)
CREATE TABLE IF NOT EXISTS strategic_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_active_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  primary_active_experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
  primary_business_objective VARCHAR(255) NOT NULL DEFAULT 'ACHIEVE_FIRST_RETAINED_CUSTOMER',
  primary_strategy_id UUID,
  focus_horizon VARCHAR(50) NOT NULL DEFAULT 'TODAY',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  operating_period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  state_summary JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_strategic_states_period_demo UNIQUE (operating_period_date, is_demo)
);

CREATE INDEX IF NOT EXISTS idx_strategic_states_date ON strategic_states(operating_period_date DESC);
CREATE INDEX IF NOT EXISTS idx_strategic_states_demo ON strategic_states(is_demo);

-- 2. Product Lifecycle States (Detailed 12-stage product governance)
CREATE TABLE IF NOT EXISTS product_lifecycle_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'DISCOVERED',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  launched_at TIMESTAMPTZ,
  distribution_started_at TIMESTAMPTZ,
  total_exposure_reach INT NOT NULL DEFAULT 0,
  active_channels JSONB NOT NULL DEFAULT '[]',
  sample_sizes_summary JSONB NOT NULL DEFAULT '{}',
  experiments_conducted_count INT NOT NULL DEFAULT 0,
  modifications_history JSONB NOT NULL DEFAULT '[]',
  switching_evaluation VARCHAR(50) NOT NULL DEFAULT 'CONTINUE',
  switching_rationale TEXT,
  evidence_maturity_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_lifecycle_product UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_lifecycle_stage ON product_lifecycle_states(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_product_lifecycle_product ON product_lifecycle_states(product_id);

-- 3. Observation Windows (Dynamic timing & data maturity tracking)
CREATE TABLE IF NOT EXISTS observation_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel VARCHAR(100),
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_review_date TIMESTAMPTZ,
  min_sample_size_required INT NOT NULL DEFAULT 50,
  actual_sample_size_collected INT NOT NULL DEFAULT 0,
  timing_basis VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  window_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  waiting_reasons JSONB NOT NULL DEFAULT '[]',
  next_decision_preview VARCHAR(100),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_windows_product ON observation_windows(product_id);
CREATE INDEX IF NOT EXISTS idx_obs_windows_status ON observation_windows(window_status);

-- 4. Business Funnel Stages (9-stage funnel analysis with sample-size guardrails)
CREATE TABLE IF NOT EXISTS business_funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL,
  stage_order INT NOT NULL,
  raw_count INT NOT NULL DEFAULT 0,
  conversion_rate_to_next NUMERIC(6,3),
  sample_size_status VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  confidence VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  evaluated_period_days INT NOT NULL DEFAULT 14,
  bottleneck_candidate BOOLEAN NOT NULL DEFAULT false,
  hypothesis TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_stages_prod ON business_funnel_stages(product_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_order ON business_funnel_stages(stage_order);

-- 5. Strategy Bottlenecks (18 structural bottleneck categories)
CREATE TABLE IF NOT EXISTS strategy_bottlenecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottleneck_type VARCHAR(100) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  magnitude_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  business_impact_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  evidence_strength VARCHAR(50) NOT NULL DEFAULT 'LOW',
  sample_size INT NOT NULL DEFAULT 0,
  reversibility VARCHAR(50) NOT NULL DEFAULT 'HIGH',
  resource_requirement VARCHAR(50) NOT NULL DEFAULT 'LOW',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  evidence_data JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  recommended_focus TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_bottlenecks_type ON strategy_bottlenecks(bottleneck_type);
CREATE INDEX IF NOT EXISTS idx_strategy_bottlenecks_primary ON strategy_bottlenecks(is_primary);

-- 6. Strategy Patterns (Pattern recognition across cohorts, channels, failure modes)
CREATE TABLE IF NOT EXISTS strategy_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
  description TEXT NOT NULL,
  supporting_observations JSONB NOT NULL DEFAULT '[]',
  sample_size INT NOT NULL DEFAULT 0,
  time_period_days INT NOT NULL DEFAULT 30,
  causality_type VARCHAR(50) NOT NULL DEFAULT 'CORRELATED',
  confidence VARCHAR(50) NOT NULL DEFAULT 'LOW',
  limitations TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_patterns_cat ON strategy_patterns(category);

-- 7. Strategy Recommendations (Generated strategic options)
CREATE TABLE IF NOT EXISTS strategy_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective VARCHAR(255) NOT NULL,
  problem_addressed TEXT NOT NULL,
  proposed_action TEXT NOT NULL,
  strategy_type VARCHAR(50) NOT NULL DEFAULT 'IMPROVE',
  horizon VARCHAR(50) NOT NULL DEFAULT 'TODAY',
  evidence_provenance VARCHAR(50) NOT NULL DEFAULT 'CALCULATED',
  evidence_summary JSONB NOT NULL DEFAULT '{}',
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  expected_outcome TEXT NOT NULL,
  assumptions JSONB NOT NULL DEFAULT '[]',
  resource_requirements JSONB NOT NULL DEFAULT '{"compute": 1, "time_weight": 1}',
  risks JSONB NOT NULL DEFAULT '[]',
  reversibility VARCHAR(50) NOT NULL DEFAULT 'HIGH',
  observation_requirements JSONB NOT NULL DEFAULT '{}',
  success_criteria TEXT,
  failure_criteria TEXT,
  rank_order INT NOT NULL DEFAULT 1,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_recs_primary ON strategy_recommendations(is_primary);
CREATE INDEX IF NOT EXISTS idx_strategy_recs_status ON strategy_recommendations(status);

-- 8. Strategy Actions (3-5 prioritized executable actions)
CREATE TABLE IF NOT EXISTS strategy_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategy_recommendations(id) ON DELETE CASCADE,
  priority_order INT NOT NULL DEFAULT 1,
  action_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  target_module VARCHAR(100) NOT NULL,
  target_action VARCHAR(100) NOT NULL,
  execution_type VARCHAR(50) NOT NULL DEFAULT 'AUTOMATIC',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  estimated_cost_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payload JSONB NOT NULL DEFAULT '{}',
  linked_job_id UUID,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_actions_strategy ON strategy_actions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_actions_status ON strategy_actions(status);

-- 9. Daily Strategic Briefs (Concise, structured operational briefings)
CREATE TABLE IF NOT EXISTS daily_strategic_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_business_state JSONB NOT NULL DEFAULT '{}',
  what_changed TEXT NOT NULL,
  what_data_says TEXT NOT NULL,
  what_we_know JSONB NOT NULL DEFAULT '[]',
  what_we_do_not_know JSONB NOT NULL DEFAULT '[]',
  important_patterns JSONB NOT NULL DEFAULT '[]',
  current_bottleneck JSONB NOT NULL DEFAULT '{}',
  primary_strategy JSONB NOT NULL DEFAULT '{}',
  today_priority TEXT NOT NULL,
  next_actions JSONB NOT NULL DEFAULT '[]',
  what_we_are_waiting_for TEXT,
  what_would_change_strategy TEXT NOT NULL,
  risks JSONB NOT NULL DEFAULT '[]',
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  evidence_provenance JSONB NOT NULL DEFAULT '[]',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_brief_date_demo UNIQUE (brief_date, is_demo)
);

CREATE INDEX IF NOT EXISTS idx_daily_briefs_date ON daily_strategic_briefs(brief_date DESC);

-- 10. Strategy Changes (Auditable shift log)
CREATE TABLE IF NOT EXISTS strategy_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_strategy_id UUID REFERENCES strategy_recommendations(id) ON DELETE SET NULL,
  new_strategy_id UUID REFERENCES strategy_recommendations(id) ON DELETE SET NULL,
  old_strategy_name VARCHAR(255),
  new_strategy_name VARCHAR(255) NOT NULL,
  trigger_reason TEXT NOT NULL,
  evidence_diff JSONB NOT NULL DEFAULT '{}',
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_changes_date ON strategy_changes(recorded_at DESC);

-- 11. Strategy Memory (Long-term organizational memory & outcome variance)
CREATE TABLE IF NOT EXISTS strategy_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategy_recommendations(id) ON DELETE SET NULL,
  action_name VARCHAR(255) NOT NULL,
  conditions_description TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  actual_outcome TEXT,
  variance_analysis TEXT,
  learnings JSONB NOT NULL DEFAULT '[]',
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_memory_created ON strategy_memory(created_at DESC);

-- ==============================================================================
-- PHASE 14: End-to-End Reality Test & Autonomous Business Simulation Schema
-- ==============================================================================

-- Master test runs table
CREATE TABLE IF NOT EXISTS simulation_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_mode VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    realm VARCHAR(30) NOT NULL DEFAULT 'SIMULATION',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_scenarios INT NOT NULL DEFAULT 0,
    passed_scenarios INT NOT NULL DEFAULT 0,
    failed_scenarios INT NOT NULL DEFAULT 0,
    skipped_scenarios INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT DEFAULT 0,
    triggered_by VARCHAR(100) DEFAULT 'OPERATOR',
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Granular scenario execution results
CREATE TABLE IF NOT EXISTS simulation_scenario_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES simulation_test_runs(id) ON DELETE CASCADE,
    scenario_id VARCHAR(50) NOT NULL,
    scenario_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    realm VARCHAR(30) NOT NULL DEFAULT 'SIMULATION',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    duration_ms INT DEFAULT 0,
    error_message TEXT,
    primary_bottleneck VARCHAR(100),
    strategy_decision VARCHAR(100),
    what_waiting_for TEXT,
    human_approval_required BOOLEAN DEFAULT false,
    safety_invariants_verified JSONB DEFAULT '[]'::jsonb,
    state_transitions JSONB DEFAULT '[]'::jsonb,
    evidence_flow JSONB DEFAULT '[]'::jsonb,
    execution_trace JSONB DEFAULT '[]'::jsonb,
    raw_output JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auditable simulation timeline logs
CREATE TABLE IF NOT EXISTS simulation_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES simulation_test_runs(id) ON DELETE CASCADE,
    scenario_id VARCHAR(50) NOT NULL,
    phase VARCHAR(50) NOT NULL,
    step_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    decision VARCHAR(150),
    evidence_summary TEXT,
    state_transition VARCHAR(150),
    safety_decision VARCHAR(150),
    approval_requirement VARCHAR(150),
    execution_result VARCHAR(50) DEFAULT 'SUCCESS',
    input_payload JSONB DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    error_detail TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reality Scorecard & Production Readiness Reports
CREATE TABLE IF NOT EXISTS reality_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES simulation_test_runs(id) ON DELETE CASCADE,
    realm VARCHAR(30) NOT NULL DEFAULT 'SIMULATION',
    architecture_integrity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    data_integrity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    evidence_integrity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    lifecycle_integrity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    strategy_integrity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    autonomy_integrity_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    zero_spend_compliance_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    security_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    failure_recovery_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    integration_readiness_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    auditability_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    production_readiness_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    overall_verification_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    category_evaluations JSONB DEFAULT '{}'::jsonb,
    production_readiness_report JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sim_runs_status ON simulation_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_sim_runs_created ON simulation_test_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_scenario_run ON simulation_scenario_results(run_id);
CREATE INDEX IF NOT EXISTS idx_sim_scenario_id ON simulation_scenario_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sim_scenario_status ON simulation_scenario_results(status);
CREATE INDEX IF NOT EXISTS idx_sim_audit_run ON simulation_audit_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_sim_audit_scenario ON simulation_audit_logs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sim_scorecard_run ON reality_scorecards(run_id);

-- ============================================================
-- PHASE 15: REAL-WORLD ACTIVATION & PRODUCT DEPLOYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS product_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- SELF_HOSTED, GITHUB_PAGES, CLOUDFLARE_PAGES
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED', -- PLANNED, READY, DEPLOYING, DEPLOYED, FAILED, NOT_CONNECTED, REQUIRES_MANUAL_SETUP
    public_url TEXT,
    deployment_id TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_details JSONB DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ,
    error_message TEXT,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_deployments_product_id ON product_deployments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_deployments_status ON product_deployments(status);
CREATE INDEX IF NOT EXISTS idx_product_deployments_provider ON product_deployments(provider);
CREATE INDEX IF NOT EXISTS idx_product_deployments_is_demo ON product_deployments(is_demo);



