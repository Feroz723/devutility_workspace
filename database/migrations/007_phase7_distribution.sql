-- =====================================================
-- Autonomous Business OS — Phase 7 Database Migration
-- Autonomous Distribution & Customer Acquisition Engine
-- =====================================================

-- 1. Extend or create distribution_channels table
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

-- Ensure existing columns if table already existed in Phase 2
ALTER TABLE distribution_channels
  ADD COLUMN IF NOT EXISTS connection_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
  ADD COLUMN IF NOT EXISTS automation_capability TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS credentials_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS manual_setup_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_action_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS hourly_action_limit INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS policy_constraints JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS supported_content_types JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS connection_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_connection_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_connection_error TEXT,
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dist_channels_platform ON distribution_channels(platform);
CREATE INDEX IF NOT EXISTS idx_dist_channels_conn_status ON distribution_channels(connection_status);
CREATE INDEX IF NOT EXISTS idx_dist_channels_is_demo ON distribution_channels(is_demo);

-- 2. Create distribution_strategies table
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

-- 3. Create distribution_campaigns table
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

-- 4. Create distribution_assets table
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

-- 5. Create distribution_queue table
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

-- 6. Create distribution_publications table
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

-- 7. Create distribution_metrics table
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

-- 8. Create distribution_leads table
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

-- 9. Create distribution_attribution table
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

-- 10. Create distribution_jobs table
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

-- 11. Create distribution_events table
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
