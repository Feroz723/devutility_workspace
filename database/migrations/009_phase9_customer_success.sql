-- Phase 9: Autonomous Customer Success, Activation & Retention Engine
-- Migration: 009_phase9_customer_success.sql

-- 1. Customer Profiles (behavioral tracking, communication preferences, journey stages)
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  journey_stage VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER', -- VISITOR, LEAD, CHECKOUT, CUSTOMER, ACTIVATING, ACTIVE, SUCCESSFUL, AT_RISK, DORMANT, CHURNED
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  communication_opt_in BOOLEAN NOT NULL DEFAULT true,
  daily_message_limit INT NOT NULL DEFAULT 2,
  weekly_message_limit INT NOT NULL DEFAULT 5,
  preferred_channel VARCHAR(50) NOT NULL DEFAULT 'EMAIL', -- EMAIL, IN_APP, MANUAL
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

-- 3. Customer Events (Immutable usage & behavioral event stream)
CREATE TABLE IF NOT EXISTS customer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  session_id UUID REFERENCES customer_sessions(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL, -- SIGNUP, FIRST_ACCESS, FIRST_ACTION, FIRST_VALUE, FEATURE_USED, TASK_COMPLETED, DOWNLOAD, EXPORT, SHARE, RETURN_VISIT, SESSION_STARTED, SESSION_ENDED, SUPPORT_REQUESTED, FEEDBACK_SUBMITTED, GOAL_COMPLETED, SUBSCRIPTION_RENEWED, SUBSCRIPTION_CANCELLED
  event_name VARCHAR(150) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  source VARCHAR(50) NOT NULL DEFAULT 'IN_APP', -- IN_APP, API, SYSTEM, MANUAL
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
  status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, ACTIVATED, STALLED, FAILED
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
  completion_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, ACHIEVED, PARTIALLY_ACHIEVED, ABANDONED, FAILED
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
  health_score INT NOT NULL DEFAULT 50, -- 0 to 100
  status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN', -- HEALTHY, AT_RISK, DORMANT, CHURNED, UNKNOWN
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
  feedback_type VARCHAR(50) NOT NULL DEFAULT 'SATISFACTION', -- SATISFACTION, NPS, CSAT, DIFFICULTY, BUG, FEATURE_REQUEST, PRAISE, COMPLAINT, CHURN_REASON
  score INT, -- e.g. 1-10 for NPS/CSAT
  comment TEXT,
  topic VARCHAR(100),
  sentiment VARCHAR(50) DEFAULT 'NEUTRAL', -- POSITIVE, NEUTRAL, NEGATIVE
  source VARCHAR(50) NOT NULL DEFAULT 'IN_APP', -- IN_APP, EMAIL, SUPPORT, MANUAL, IMPORT
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
  category VARCHAR(50) NOT NULL DEFAULT 'USAGE', -- ACCESS, PAYMENT, DELIVERY, BUG, USAGE, FEATURE_REQUEST, OTHER
  severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, TRIAGED, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED
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
  sender_type VARCHAR(50) NOT NULL, -- CUSTOMER, AGENT, AI_ASSISTANT, SYSTEM
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
  intervention_type VARCHAR(50) NOT NULL, -- ONBOARDING_REMINDER, USAGE_GUIDANCE, HELP_ARTICLE, TROUBLESHOOTING, FEATURE_EXPLANATION, FEEDBACK_REQUEST, SUPPORT_ESCALATION, MANUAL_FOLLOW_UP
  reason VARCHAR(255) NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  recommended_action TEXT NOT NULL,
  urgency VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  channel VARCHAR(50) NOT NULL DEFAULT 'EMAIL', -- EMAIL, IN_APP, MANUAL
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, APPROVED, SCHEDULED, SENT, COMPLETED, FAILED, CANCELLED, REQUIRES_MANUAL_ACTION
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
  steps JSONB NOT NULL DEFAULT '[]', -- array of { id, title, completed, completed_at }
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
  churn_status VARCHAR(50) NOT NULL DEFAULT 'CHURN_RISK', -- CHURN_RISK, CONFIRMED_CHURN
  risk_score INT NOT NULL DEFAULT 50, -- 0 to 100
  primary_reason VARCHAR(100), -- INACTIVITY, CANCELLATION, PRODUCT_DISSATISFACTION, ENTITLEMENT_EXPIRED, REPEATED_BUGS, OTHER
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
  job_type VARCHAR(100) NOT NULL, -- CALCULATE_HEALTH, AGGREGATE_RETENTION, DETECT_CHURN, GENERATE_INTERVENTIONS, TRIAGE_SUPPORT, ANALYZE_FEEDBACK, GENERATE_LEARNING
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
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
