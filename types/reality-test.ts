import { z } from "zod";

// ==============================================================================
// 1. DATA REALMS & ISOLATION
// ==============================================================================

export const DataRealm = z.enum(["REAL", "DRY_RUN", "SIMULATION", "DEMO"]);
export type DataRealm = z.infer<typeof DataRealm>;

// ==============================================================================
// 2. SCENARIO IDENTIFIERS & CATEGORIES
// ==============================================================================

export const ScenarioId = z.enum([
  "SCENARIO_A", // NEW OPPORTUNITY
  "SCENARIO_B", // PRIMARY PRODUCT SELECTED
  "SCENARIO_C", // LOW TRAFFIC
  "SCENARIO_D", // HIGH TRAFFIC / LOW SIGNUP
  "SCENARIO_E", // GOOD SIGNUP / LOW ACTIVATION
  "SCENARIO_F", // GOOD ACTIVATION / POOR RETENTION
  "SCENARIO_G", // GOOD RETENTION / LOW PAYMENT
  "SCENARIO_H", // DELAYED CUSTOMER RESPONSE
  "SCENARIO_I", // CHANNEL FAILURE
  "SCENARIO_J", // AI PROVIDER FAILURE
  "SCENARIO_K", // PAYMENT PROVIDER UNAVAILABLE
  "SCENARIO_L", // STRONG PRODUCT PERFORMANCE
  "SCENARIO_M", // PRODUCT FAILURE
  "SCENARIO_N", // BETTER NEW OPPORTUNITY
  "SCENARIO_O", // CONTRADICTORY EVIDENCE
  "SCENARIO_P", // INSUFFICIENT SAMPLE SIZE
  "SCENARIO_Q", // EMERGENCY SHUTDOWN
  "SCENARIO_R", // ZERO-SPEND VIOLATION
  "FULL_CYCLE", // FULL 13-PHASE AUTONOMOUS CYCLE
]);
export type ScenarioId = z.infer<typeof ScenarioId>;

export const ScenarioCategory = z.enum([
  "LIFECYCLE",
  "BOTTLENECK",
  "INTEGRATION",
  "SAFETY",
  "GOVERNANCE",
  "PERFORMANCE",
]);
export type ScenarioCategory = z.infer<typeof ScenarioCategory>;

export const ScenarioStatus = z.enum([
  "PENDING",
  "RUNNING",
  "PASSED",
  "FAILED",
  "SKIPPED",
]);
export type ScenarioStatus = z.infer<typeof ScenarioStatus>;

export const TestRunStatus = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type TestRunStatus = z.infer<typeof TestRunStatus>;

export const TriggerMode = z.enum(["MANUAL", "SCHEDULED", "CI", "API"]);
export type TriggerMode = z.infer<typeof TriggerMode>;

// ==============================================================================
// 3. SAFETY INVARIANTS (1 to 12)
// ==============================================================================

export const SafetyInvariantId = z.enum([
  "INVARIANT_1_ZERO_SPEND",            // No automatic spending > ₹0
  "INVARIANT_2_NO_FABRICATED_RESULTS", // No fabricated business results
  "INVARIANT_3_NO_REALM_POLLUTION",    // No simulated data becomes production truth
  "INVARIANT_4_PAID_INTEGRATIONS_OFF", // No paid integration can silently activate
  "INVARIANT_5_UNTRUSTED_CONTENT_SAFE",// No external research content can execute instructions
  "INVARIANT_6_MULTI_SIGNAL_STOP",     // No single weak metric can automatically kill a product
  "INVARIANT_7_INSUFFICIENT_DATA_SAFE",// Insufficient data cannot be treated as failure
  "INVARIANT_8_PRIMARY_PRODUCT_FOCUS", // Current primary product remains focused unless governance evidence supports switching
  "INVARIANT_9_CONTINUOUS_RESEARCH",   // New opportunities can continue being researched without replacing primary product
  "INVARIANT_10_APPROVAL_ENFORCED",    // Human approval cannot be bypassed
  "INVARIANT_11_KILL_SWITCH_OVERRIDE", // Emergency kill switch overrides autonomous execution
  "INVARIANT_12_UNVERIFIED_PAYMENT",   // Unverified payment cannot create paid entitlement
]);
export type SafetyInvariantId = z.infer<typeof SafetyInvariantId>;

export interface SafetyInvariantCheck {
  id: SafetyInvariantId;
  description: string;
  verified: boolean;
  notes?: string;
}

// ==============================================================================
// 4. EVIDENCE FLOW & EXECUTION TRACES
// ==============================================================================

export interface EvidenceFlowItem {
  phase: string;
  sourceModule: string;
  targetModule: string;
  evidenceType: string;
  provenance: "OBSERVED" | "CALCULATED" | "EXTERNAL_EVIDENCE" | "INFERENCE" | "UNKNOWN";
  sampleSize: number;
  confidence: string;
  summary: string;
  isSimulated: boolean;
  timestamp: string;
}

export interface StateTransitionItem {
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  trigger: string;
  reason: string;
  timestamp: string;
}

export interface StrategyDecisionTrace {
  lifecycleStage: string;
  primaryProduct: string;
  primaryBottleneck: string;
  availableEvidence: Record<string, unknown>;
  evidenceMaturity: "IMMATURE" | "DEVELOPING" | "MATURE";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
  recommendedStrategy: string;
  recommendedActions: Array<{
    actionName: string;
    priority: number;
    targetModule: string;
    costInr: number;
    requiresApproval: boolean;
  }>;
  whatWaitingFor: string;
  whatWouldChangeStrategy: string;
  humanApprovalRequired: boolean;
}

// ==============================================================================
// 5. SCENARIO & TEST RUN MODELS
// ==============================================================================

export const SimulationScenarioResultSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  scenario_id: ScenarioId,
  scenario_name: z.string(),
  category: ScenarioCategory,
  realm: DataRealm,
  status: ScenarioStatus,
  duration_ms: z.number().int().nonnegative().default(0),
  error_message: z.string().nullable().optional(),
  primary_bottleneck: z.string().nullable().optional(),
  strategy_decision: z.string().nullable().optional(),
  what_waiting_for: z.string().nullable().optional(),
  human_approval_required: z.boolean().default(false),
  safety_invariants_verified: z.array(z.any()).default([]),
  state_transitions: z.array(z.any()).default([]),
  evidence_flow: z.array(z.any()).default([]),
  execution_trace: z.array(z.any()).default([]),
  raw_output: z.record(z.unknown()).default({}),
  created_at: z.string(),
});
export type SimulationScenarioResult = z.infer<typeof SimulationScenarioResultSchema>;

export const SimulationTestRunSchema = z.object({
  id: z.string().uuid(),
  trigger_mode: TriggerMode,
  realm: DataRealm,
  status: TestRunStatus,
  total_scenarios: z.number().int().nonnegative().default(0),
  passed_scenarios: z.number().int().nonnegative().default(0),
  failed_scenarios: z.number().int().nonnegative().default(0),
  skipped_scenarios: z.number().int().nonnegative().default(0),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  duration_ms: z.number().int().nonnegative().default(0),
  triggered_by: z.string().default("OPERATOR"),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
});
export type SimulationTestRun = z.infer<typeof SimulationTestRunSchema>;

export const SimulationAuditLogSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  scenario_id: z.string(),
  phase: z.string(),
  step_name: z.string(),
  action: z.string(),
  decision: z.string().nullable().optional(),
  evidence_summary: z.string().nullable().optional(),
  state_transition: z.string().nullable().optional(),
  safety_decision: z.string().nullable().optional(),
  approval_requirement: z.string().nullable().optional(),
  execution_result: z.enum(["SUCCESS", "FAILED", "BLOCKED", "SKIPPED"]).default("SUCCESS"),
  input_payload: z.record(z.unknown()).default({}),
  output_payload: z.record(z.unknown()).default({}),
  error_detail: z.string().nullable().optional(),
  timestamp: z.string(),
});
export type SimulationAuditLog = z.infer<typeof SimulationAuditLogSchema>;

// ==============================================================================
// 6. REALITY SCORECARD (12 INTEGRITY CATEGORIES)
// ==============================================================================

export interface CategoryEvaluation {
  category: string;
  score: number; // 0 to 100
  status: "PASSED" | "WARNING" | "FAILED";
  testsEvaluated: number;
  testsPassed: number;
  invariantsChecked: string[];
  findings: string[];
}

export const RealityScorecardSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  realm: DataRealm,
  architecture_integrity_score: z.number().min(0).max(100),
  data_integrity_score: z.number().min(0).max(100),
  evidence_integrity_score: z.number().min(0).max(100),
  lifecycle_integrity_score: z.number().min(0).max(100),
  strategy_integrity_score: z.number().min(0).max(100),
  autonomy_integrity_score: z.number().min(0).max(100),
  zero_spend_compliance_score: z.number().min(0).max(100),
  security_score: z.number().min(0).max(100),
  failure_recovery_score: z.number().min(0).max(100),
  integration_readiness_score: z.number().min(0).max(100),
  auditability_score: z.number().min(0).max(100),
  production_readiness_score: z.number().min(0).max(100),
  overall_verification_score: z.number().min(0).max(100),
  category_evaluations: z.record(z.any()).default({}),
  production_readiness_report: z.record(z.any()).default({}),
  created_at: z.string(),
});
export type RealityScorecard = z.infer<typeof RealityScorecardSchema>;

// ==============================================================================
// 7. BRUTAL HONESTY PRODUCTION READINESS REPORT
// ==============================================================================

export interface ProductionReadinessReport {
  generatedAt: string;
  overallStatus: "SOFTWARE_VERIFIED_MARKET_UNPROVEN" | "DEGRADED" | "BLOCKED";
  whatIsVerified: string[];
  whatIsSimulated: string[];
  whatIsConnected: string[];
  whatRequiresManualSetup: string[];
  whatIsNotImplemented: string[];
  whatCanRunAutonomously: string[];
  whatStillRequiresHumanApproval: string[];
  whatCanFail: string[];
  knownLimitations: string[];
  securityLimitations: string[];
  externalDependencies: string[];
}

// ==============================================================================
// 8. FAILURE INJECTION SPECIFICATIONS
// ==============================================================================

export type FaultTarget =
  | "DATABASE"
  | "AI_PROVIDER"
  | "RESEARCH_PROVIDER"
  | "PAYMENT_GATEWAY"
  | "DISTRIBUTION_CHANNEL"
  | "EMAIL_SERVICE"
  | "WORKER_CRASH"
  | "JOB_TIMEOUT"
  | "DUPLICATE_JOB"
  | "MALFORMED_PAYLOAD"
  | "PROMPT_INJECTION"
  | "ZERO_SPEND_VIOLATION";

export interface FaultInjectionRule {
  target: FaultTarget;
  enabled: boolean;
  failureType: "TIMEOUT" | "ERROR_500" | "MALFORMED" | "AUTH_FAILURE" | "CRASH" | "SECURITY_ATTACK";
  errorMessage?: string;
  latencyMs?: number;
  triggerCount?: number;
}
