-- Phase 13: Data-Driven Strategy & Evidence-Based Business Governor
-- Migration: 013_phase13_strategy_governor.sql

-- 1. Strategic States (Global Primary Focus & Active Operating Direction)
CREATE TABLE IF NOT EXISTS strategic_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_active_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  primary_active_experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
  primary_business_objective VARCHAR(255) NOT NULL DEFAULT 'ACHIEVE_FIRST_RETAINED_CUSTOMER',
  primary_strategy_id UUID, -- References strategy_recommendations
  focus_horizon VARCHAR(50) NOT NULL DEFAULT 'TODAY', -- TODAY, SHORT_TERM, CURRENT_EXPERIMENT, PRODUCT_LIFECYCLE, WEEKLY, LONGER_TERM
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REASSESSING, WAITING_FOR_DATA, PAUSED
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
  -- DISCOVERED, VALIDATING, EXPERIMENTING, BUILDING, LAUNCHED, DISTRIBUTING, OBSERVING, EVALUATING, ITERATING, GROWING, PAUSED, STOPPED
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  launched_at TIMESTAMPTZ,
  distribution_started_at TIMESTAMPTZ,
  total_exposure_reach INT NOT NULL DEFAULT 0,
  active_channels JSONB NOT NULL DEFAULT '[]',
  sample_sizes_summary JSONB NOT NULL DEFAULT '{}', -- Sample size at each funnel stage
  experiments_conducted_count INT NOT NULL DEFAULT 0,
  modifications_history JSONB NOT NULL DEFAULT '[]', -- Log of changes made & outcomes
  switching_evaluation VARCHAR(50) NOT NULL DEFAULT 'CONTINUE', -- CONTINUE, IMPROVE, SCALE, PAUSE, STOP, REPLACE
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
  -- OBSERVED_INTERNAL, EXTERNAL_EVIDENCE, STATISTICAL_ESTIMATE, MODEL_INFERENCE, UNKNOWN
  window_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS', 
  -- IN_PROGRESS, MATURE, INSUFFICIENT_EXPOSURE, TIMING_UNKNOWN, EXPIRED
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
  -- REACH, VISIT, SIGNUP, ACTIVATION, FIRST_VALUE, REPEAT_USAGE, RETENTION, PAYMENT, REPEAT_PURCHASE
  stage_order INT NOT NULL,
  raw_count INT NOT NULL DEFAULT 0,
  conversion_rate_to_next NUMERIC(6,3), -- NULL if insufficient data
  sample_size_status VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA', -- SUFFICIENT, INSUFFICIENT_DATA
  confidence VARCHAR(50) NOT NULL DEFAULT 'INSUFFICIENT_DATA', -- VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH, INSUFFICIENT_DATA
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
  -- demand, awareness, distribution, targeting, positioning, landing_page_conversion, signup_friction,
  -- onboarding, activation, product_value, retention, pricing, checkout, payment, delivery,
  -- customer_support, channel_efficiency, technical_reliability
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  magnitude_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  business_impact_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  evidence_strength VARCHAR(50) NOT NULL DEFAULT 'LOW', -- VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH
  sample_size INT NOT NULL DEFAULT 0,
  reversibility VARCHAR(50) NOT NULL DEFAULT 'HIGH', -- HIGH, MODERATE, LOW, IRREVERSIBLE
  resource_requirement VARCHAR(50) NOT NULL DEFAULT 'LOW', -- MINIMAL, LOW, MEDIUM, HIGH
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
  -- FAILURE_MODE, DISTRIBUTION_EFFICIENCY, CUSTOMER_FRICTION, COHORT_DIVERGENCE, PRICING_RESPONSE, REJECTION_REASON
  description TEXT NOT NULL,
  supporting_observations JSONB NOT NULL DEFAULT '[]',
  sample_size INT NOT NULL DEFAULT 0,
  time_period_days INT NOT NULL DEFAULT 30,
  causality_type VARCHAR(50) NOT NULL DEFAULT 'CORRELATED', 
  -- CORRELATED, ASSOCIATED, TEMPORALLY_FOLLOWING, POSSIBLE_DRIVER, HYPOTHESIS
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
  -- CONTINUE, IMPROVE, SCALE, PAUSE, STOP, REPLACE, WAIT_FOR_DATA
  horizon VARCHAR(50) NOT NULL DEFAULT 'TODAY', 
  -- TODAY, SHORT_TERM, CURRENT_EXPERIMENT, PRODUCT_LIFECYCLE, WEEKLY, LONGER_TERM
  evidence_provenance VARCHAR(50) NOT NULL DEFAULT 'CALCULATED',
  -- OBSERVED, CALCULATED, EXTERNAL_EVIDENCE, INFERENCE, FORECAST, UNKNOWN
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
  -- PROPOSED, ACCEPTED, EXECUTING, WAITING, COMPLETED, SUPERSEDED, REJECTED
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
  -- AUTOMATIC, REQUIRES_APPROVAL, REQUIRES_MANUAL_SETUP, BLOCKED, WAITING
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', 
  -- PENDING, QUEUED, IN_PROGRESS, COMPLETED, FAILED, WAITING_FOR_DATA, SKIPPED
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
