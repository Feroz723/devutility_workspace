-- ==============================================================================
-- PHASE 14: End-to-End Reality Test & Autonomous Business Simulation Schema
-- Migration 014: Simulation Isolation, Scenario Traces, Audit Logs & Reality Scorecard
-- ==============================================================================

-- Master test runs table
CREATE TABLE IF NOT EXISTS simulation_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_mode VARCHAR(50) NOT NULL DEFAULT 'MANUAL', -- 'MANUAL', 'SCHEDULED', 'CI', 'API'
    realm VARCHAR(30) NOT NULL DEFAULT 'SIMULATION',     -- 'SIMULATION', 'DRY_RUN', 'DEMO'
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',       -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
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
    scenario_id VARCHAR(50) NOT NULL,                    -- 'SCENARIO_A' through 'SCENARIO_R', 'FULL_CYCLE'
    scenario_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,                      -- 'LIFECYCLE', 'BOTTLENECK', 'INTEGRATION', 'SAFETY', 'GOVERNANCE', 'PERFORMANCE'
    realm VARCHAR(30) NOT NULL DEFAULT 'SIMULATION',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',       -- 'PENDING', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED'
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
    execution_result VARCHAR(50) DEFAULT 'SUCCESS',      -- 'SUCCESS', 'FAILED', 'BLOCKED', 'SKIPPED'
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
