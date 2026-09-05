import { z } from "zod";

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const StrategicHorizon = z.enum([
  "TODAY",
  "SHORT_TERM",
  "CURRENT_EXPERIMENT",
  "PRODUCT_LIFECYCLE",
  "WEEKLY",
  "LONGER_TERM",
]);
export type StrategicHorizon = z.infer<typeof StrategicHorizon>;

export const StrategicStatus = z.enum([
  "ACTIVE",
  "REASSESSING",
  "WAITING_FOR_DATA",
  "PAUSED",
]);
export type StrategicStatus = z.infer<typeof StrategicStatus>;

export const ProductLifecycleStage = z.enum([
  "DISCOVERED",
  "VALIDATING",
  "EXPERIMENTING",
  "BUILDING",
  "LAUNCHED",
  "DISTRIBUTING",
  "OBSERVING",
  "EVALUATING",
  "ITERATING",
  "GROWING",
  "PAUSED",
  "STOPPED",
]);
export type ProductLifecycleStage = z.infer<typeof ProductLifecycleStage>;

export const SwitchingEvaluation = z.enum([
  "CONTINUE",
  "IMPROVE",
  "SCALE",
  "PAUSE",
  "STOP",
  "REPLACE",
]);
export type SwitchingEvaluation = z.infer<typeof SwitchingEvaluation>;

export const TimingBasis = z.enum([
  "OBSERVED_INTERNAL",
  "EXTERNAL_EVIDENCE",
  "STATISTICAL_ESTIMATE",
  "MODEL_INFERENCE",
  "UNKNOWN",
]);
export type TimingBasis = z.infer<typeof TimingBasis>;

export const WindowStatus = z.enum([
  "IN_PROGRESS",
  "MATURE",
  "INSUFFICIENT_EXPOSURE",
  "TIMING_UNKNOWN",
  "EXPIRED",
]);
export type WindowStatus = z.infer<typeof WindowStatus>;

export const FunnelStageName = z.enum([
  "REACH",
  "VISIT",
  "SIGNUP",
  "ACTIVATION",
  "FIRST_VALUE",
  "REPEAT_USAGE",
  "RETENTION",
  "PAYMENT",
  "REPEAT_PURCHASE",
]);
export type FunnelStageName = z.infer<typeof FunnelStageName>;

export const SampleSizeStatus = z.enum([
  "SUFFICIENT",
  "INSUFFICIENT_DATA",
]);
export type SampleSizeStatus = z.infer<typeof SampleSizeStatus>;

export const BottleneckType = z.enum([
  "demand",
  "awareness",
  "distribution",
  "targeting",
  "positioning",
  "landing_page_conversion",
  "signup_friction",
  "onboarding",
  "activation",
  "product_value",
  "retention",
  "pricing",
  "checkout",
  "payment",
  "delivery",
  "customer_support",
  "channel_efficiency",
  "technical_reliability",
]);
export type BottleneckType = z.infer<typeof BottleneckType>;

export const CausalityType = z.enum([
  "CORRELATED",
  "ASSOCIATED",
  "TEMPORALLY_FOLLOWING",
  "POSSIBLE_DRIVER",
  "HYPOTHESIS",
]);
export type CausalityType = z.infer<typeof CausalityType>;

export const StrategyType = z.enum([
  "CONTINUE",
  "IMPROVE",
  "SCALE",
  "PAUSE",
  "STOP",
  "REPLACE",
  "WAIT_FOR_DATA",
]);
export type StrategyType = z.infer<typeof StrategyType>;

export const StrategyConfidence = z.enum([
  "VERY_LOW",
  "LOW",
  "MEDIUM",
  "HIGH",
  "VERY_HIGH",
]);
export type StrategyConfidence = z.infer<typeof StrategyConfidence>;

export const EvidenceProvenance = z.enum([
  "OBSERVED",
  "CALCULATED",
  "EXTERNAL_EVIDENCE",
  "INFERENCE",
  "FORECAST",
  "UNKNOWN",
]);
export type EvidenceProvenance = z.infer<typeof EvidenceProvenance>;

export const ExecutionType = z.enum([
  "AUTOMATIC",
  "REQUIRES_APPROVAL",
  "REQUIRES_MANUAL_SETUP",
  "BLOCKED",
  "WAITING",
]);
export type ExecutionType = z.infer<typeof ExecutionType>;

export const StrategyActionStatus = z.enum([
  "PENDING",
  "QUEUED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "WAITING_FOR_DATA",
  "SKIPPED",
]);
export type StrategyActionStatus = z.infer<typeof StrategyActionStatus>;

// ==========================================
// SCHEMAS & ENTITY MODELS
// ==========================================

export const StrategicStateSchema = z.object({
  id: z.string().uuid(),
  primary_active_product_id: z.string().uuid().nullable(),
  primary_active_experiment_id: z.string().uuid().nullable(),
  primary_business_objective: z.string(),
  primary_strategy_id: z.string().uuid().nullable(),
  focus_horizon: StrategicHorizon,
  status: StrategicStatus,
  operating_period_date: z.string(),
  state_summary: z.record(z.any()),
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StrategicState = z.infer<typeof StrategicStateSchema>;

export const ProductLifecycleStateSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  lifecycle_stage: ProductLifecycleStage,
  discovered_at: z.string(),
  launched_at: z.string().nullable(),
  distribution_started_at: z.string().nullable(),
  total_exposure_reach: z.number(),
  active_channels: z.array(z.string()),
  sample_sizes_summary: z.record(z.any()),
  experiments_conducted_count: z.number(),
  modifications_history: z.array(z.any()),
  switching_evaluation: SwitchingEvaluation,
  switching_rationale: z.string().nullable(),
  evidence_maturity_score: z.number(),
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProductLifecycleState = z.infer<typeof ProductLifecycleStateSchema>;

export const ObservationWindowSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  channel: z.string().nullable(),
  window_start: z.string(),
  target_review_date: z.string().nullable(),
  min_sample_size_required: z.number(),
  actual_sample_size_collected: z.number(),
  timing_basis: TimingBasis,
  window_status: WindowStatus,
  waiting_reasons: z.array(z.any()),
  next_decision_preview: z.string().nullable(),
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ObservationWindow = z.infer<typeof ObservationWindowSchema>;

export const BusinessFunnelStageSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  stage_name: FunnelStageName,
  stage_order: z.number(),
  raw_count: z.number(),
  conversion_rate_to_next: z.number().nullable(),
  sample_size_status: SampleSizeStatus,
  confidence: z.string(),
  evaluated_period_days: z.number(),
  bottleneck_candidate: z.boolean(),
  hypothesis: z.string().nullable(),
  is_demo: z.boolean(),
  recorded_at: z.string(),
});
export type BusinessFunnelStage = z.infer<typeof BusinessFunnelStageSchema>;

export const StrategyBottleneckSchema = z.object({
  id: z.string().uuid(),
  bottleneck_type: BottleneckType,
  product_id: z.string().uuid().nullable(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  magnitude_score: z.number(),
  business_impact_score: z.number(),
  evidence_strength: z.string(),
  sample_size: z.number(),
  reversibility: z.string(),
  resource_requirement: z.string(),
  is_primary: z.boolean(),
  evidence_data: z.record(z.any()),
  description: z.string(),
  recommended_focus: z.string().nullable(),
  is_resolved: z.boolean(),
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StrategyBottleneck = z.infer<typeof StrategyBottleneckSchema>;

export const StrategyPatternSchema = z.object({
  id: z.string().uuid(),
  pattern_name: z.string(),
  category: z.string(),
  description: z.string(),
  supporting_observations: z.array(z.any()),
  sample_size: z.number(),
  time_period_days: z.number(),
  causality_type: CausalityType,
  confidence: z.string(),
  limitations: z.string().nullable(),
  is_active: z.boolean(),
  is_demo: z.boolean(),
  created_at: z.string(),
});
export type StrategyPattern = z.infer<typeof StrategyPatternSchema>;

export const StrategyRecommendationSchema = z.object({
  id: z.string().uuid(),
  objective: z.string(),
  problem_addressed: z.string(),
  proposed_action: z.string(),
  strategy_type: StrategyType,
  horizon: StrategicHorizon,
  evidence_provenance: EvidenceProvenance,
  evidence_summary: z.record(z.any()),
  confidence: StrategyConfidence,
  expected_outcome: z.string(),
  assumptions: z.array(z.string()),
  resource_requirements: z.record(z.any()),
  risks: z.array(z.string()),
  reversibility: z.string(),
  observation_requirements: z.record(z.any()),
  success_criteria: z.string().nullable(),
  failure_criteria: z.string().nullable(),
  rank_order: z.number(),
  is_primary: z.boolean(),
  status: z.string(),
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StrategyRecommendation = z.infer<typeof StrategyRecommendationSchema>;

export const StrategyActionSchema = z.object({
  id: z.string().uuid(),
  strategy_id: z.string().uuid(),
  priority_order: z.number(),
  action_name: z.string(),
  description: z.string(),
  target_module: z.string(),
  target_action: z.string(),
  execution_type: ExecutionType,
  status: StrategyActionStatus,
  estimated_cost_inr: z.number(),
  payload: z.record(z.any()),
  linked_job_id: z.string().uuid().nullable(),
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StrategyAction = z.infer<typeof StrategyActionSchema>;

export const DailyStrategicBriefSchema = z.object({
  id: z.string().uuid(),
  brief_date: z.string(),
  current_business_state: z.record(z.any()),
  what_changed: z.string(),
  what_data_says: z.string(),
  what_we_know: z.array(z.string()),
  what_we_do_not_know: z.array(z.string()),
  important_patterns: z.array(z.any()),
  current_bottleneck: z.record(z.any()),
  primary_strategy: z.record(z.any()),
  today_priority: z.string(),
  next_actions: z.array(z.any()),
  what_we_are_waiting_for: z.string().nullable(),
  what_would_change_strategy: z.string(),
  risks: z.array(z.any()),
  confidence: StrategyConfidence,
  evidence_provenance: z.array(z.any()),
  is_demo: z.boolean(),
  created_at: z.string(),
});
export type DailyStrategicBrief = z.infer<typeof DailyStrategicBriefSchema>;

export const StrategyChangeSchema = z.object({
  id: z.string().uuid(),
  old_strategy_id: z.string().uuid().nullable(),
  new_strategy_id: z.string().uuid().nullable(),
  old_strategy_name: z.string().nullable(),
  new_strategy_name: z.string(),
  trigger_reason: z.string(),
  evidence_diff: z.record(z.any()),
  confidence: StrategyConfidence,
  is_demo: z.boolean(),
  recorded_at: z.string(),
});
export type StrategyChange = z.infer<typeof StrategyChangeSchema>;

export const StrategyMemorySchema = z.object({
  id: z.string().uuid(),
  strategy_id: z.string().uuid().nullable(),
  action_name: z.string(),
  conditions_description: z.string(),
  expected_outcome: z.string(),
  actual_outcome: z.string().nullable(),
  variance_analysis: z.string().nullable(),
  learnings: z.array(z.any()),
  confidence: StrategyConfidence,
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StrategyMemory = z.infer<typeof StrategyMemorySchema>;
