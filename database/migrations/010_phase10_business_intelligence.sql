-- Phase 10: Autonomous Business Intelligence & Portfolio Decision Engine
-- Migration: 010_phase10_business_intelligence.sql

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
  metric_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- FUNNEL, FINANCIAL, RETENTION, SUPPORT, UNIT
  metric_value NUMERIC(12,4),
  metric_unit VARCHAR(50), -- INR, PERCENT, COUNT, SECONDS, RATIO
  has_sufficient_data BOOLEAN NOT NULL DEFAULT false,
  sample_size INT NOT NULL DEFAULT 0,
  confidence VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA', -- HIGH, MEDIUM, LOW, INSUFFICIENT_DATA
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
  cost_status VARCHAR(50) NOT NULL DEFAULT 'RECORDED_ZERO_COST', -- RECORDED_ZERO_COST, ESTIMATED_COST, RECORDED_COST, UNKNOWN_COST
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
  performance_tier VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA', -- WINNER, PROMISING, STABLE, NEEDS_IMPROVEMENT, WEAK, STOP_CANDIDATE, INSUFFICIENT_DATA
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
  channel_type VARCHAR(50) NOT NULL, -- TWITTER, LINKEDIN, REDDIT, DEVTO, MEDIUM, EMAIL_OUTREACH, DIRECT
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL,
  performance_tier VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA', -- SCALE, MAINTAIN, ITERATE, PAUSE, STOP, INSUFFICIENT_DATA
  traffic_count INT NOT NULL DEFAULT 0,
  qualified_leads_count INT NOT NULL DEFAULT 0,
  signups_count INT NOT NULL DEFAULT 0,
  customers_count INT NOT NULL DEFAULT 0,
  revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversion_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  effort_score INT NOT NULL DEFAULT 5, -- 1 to 10
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
  performance_tier VARCHAR(50) NOT NULL DEFAULT 'PROMISING', -- STRONG, PROMISING, WEAK, REQUIRES_ITERATION, STOP
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
  cohort_type VARCHAR(50) NOT NULL, -- CHANNEL, PRODUCT, OFFER, SIGNUP_PERIOD, SEGMENT
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
  subject_type VARCHAR(50) NOT NULL, -- OPPORTUNITY, EXPERIMENT, PRODUCT, CAMPAIGN, OFFER, SYSTEM
  subject_id UUID,
  subject_name VARCHAR(255) NOT NULL,
  decision VARCHAR(50) NOT NULL, -- BUILD, ITERATE, CONTINUE, SCALE, MAINTAIN, PAUSE, STOP, ARCHIVE, RESEARCH_MORE, REQUIRES_REVIEW
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, REVIEW, APPROVED, EXECUTING, COMPLETED, REJECTED, PAUSED, CANCELLED
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW, INSUFFICIENT_DATA
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
  action_type VARCHAR(50) NOT NULL, -- PRICE_ITERATION, COPY_ITERATION, STOP_PRODUCT, SCALE_CHANNEL, RUN_EXPERIMENT, FIX_DEFECT
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
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
  evidence_type VARCHAR(50) NOT NULL, -- USER_TELEMETRY, SALES_RECORD, SUPPORT_SIGNAL, RETENTION_DATA, VALIDATION_SCORE
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
  forecast_type VARCHAR(50) NOT NULL, -- TRAFFIC_TREND, SIGNUP_TREND, CUSTOMER_TREND, REVENUE_TREND, RETENTION_TREND
  target_metric VARCHAR(100) NOT NULL,
  forecast_value NUMERIC(12,2),
  projected_change_percent NUMERIC(6,2),
  confidence VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA', -- HIGH, MEDIUM, LOW, INSUFFICIENT_DATA
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
  category VARCHAR(50) NOT NULL, -- PRODUCT_WORK, EXPERIMENTS, DISTRIBUTION, CUSTOMER_SUPPORT, RESEARCH
  allocation_percentage INT NOT NULL DEFAULT 20, -- 0 to 100, sum equals 100
  time_hours_per_week NUMERIC(5,1) NOT NULL DEFAULT 0,
  compute_capacity_level VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  attention_priority INT NOT NULL DEFAULT 1,
  justification TEXT NOT NULL,
  cost_inr NUMERIC(12,2) NOT NULL DEFAULT 0, -- Strictly 0 under zero-spend rule
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
  unit VARCHAR(50) NOT NULL DEFAULT 'CUSTOMERS', -- CUSTOMERS, INR, PERCENT, RATIO
  deadline TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ACHIEVED, MISSED, PAUSED, CANCELLED
  metadata JSONB NOT NULL DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_goals_status ON business_goals(status);

-- 14. Business Risks
CREATE TABLE IF NOT EXISTS business_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL, -- TECHNICAL_RISK, CUSTOMER_RISK, REVENUE_RISK, RETENTION_RISK, DISTRIBUTION_RISK, DEPENDENCY_RISK, COST_RISK, SECURITY_RISK, COMPLIANCE_RISK
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  probability VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  evidence TEXT,
  mitigation TEXT NOT NULL,
  owner VARCHAR(100) NOT NULL DEFAULT 'system',
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, MONITORING, MITIGATED, ACCEPTED, CLOSED
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
  source_phase VARCHAR(50) NOT NULL, -- RESEARCH, VALIDATION, EXPERIMENTS, PRODUCTS, DISTRIBUTION, SALES, CUSTOMERS
  category VARCHAR(50) NOT NULL, -- WHAT_WORKED, WHAT_FAILED, PATTERN_DISCOVERED, ASSUMPTION_INVALIDATED
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  why TEXT NOT NULL,
  evidence TEXT NOT NULL,
  confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW
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
  job_type VARCHAR(100) NOT NULL, -- COLLECT_SNAPSHOT, EVALUATE_PORTFOLIO, DETECT_RISKS, GENERATE_LEARNING, RECOMPUTE_METRICS
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
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
