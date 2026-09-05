import { z } from "zod";

// ===== Enums =====

export const ExperimentType = z.enum([
  "LANDING_PAGE",
  "WAITLIST",
  "FREE_TOOL",
  "DOWNLOADABLE_PRODUCT",
  "CONCIERGE_MVP",
  "MANUAL_SERVICE",
  "CONTENT_TEST",
  "COMMUNITY_TEST",
  "GITHUB_MVP",
  "MICRO_SAAS_MVP",
]);
export type ExperimentType = z.infer<typeof ExperimentType>;

export const ExperimentStage = z.enum([
  "DISCOVERY", "RESEARCH", "VALIDATION", "BUILD", "LAUNCH",
  "DISTRIBUTION", "RESULTS", "IMPROVE", "STOP",
]);
export type ExperimentStage = z.infer<typeof ExperimentStage>;

export const ExperimentStatus = z.enum([
  // Phase 5 State Machine States
  "PROPOSED",
  "APPROVED",
  "REJECTED",
  "SETUP",
  "READY",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "ANALYZING",
  "PROMISING",
  "ITERATE",
  "WINNER",
  "STOPPED",
  "FAILED",
  // Legacy compatibility states
  "active",
  "paused",
  "completed",
  "failed",
  "stopped",
]);
export type ExperimentStatus = z.infer<typeof ExperimentStatus>;

export const ExperimentResult = z.enum([
  "WINNER",
  "PROMISING",
  "ITERATE",
  "STOPPED",
  "FAILED",
  "INSUFFICIENT_DATA",
]);
export type ExperimentResult = z.infer<typeof ExperimentResult>;

export const MetricName = z.enum([
  "traffic",
  "views",
  "clicks",
  "signups",
  "downloads",
  "tool_usage",
  "leads",
  "qualified_leads",
  "replies",
  "sales",
  "revenue",
  "conversion_rate",
  "retention",
  "engagement",
]);
export type MetricName = z.infer<typeof MetricName>;

export const MetricSource = z.enum([
  "MANUAL",
  "WEBSITE",
  "ANALYTICS",
  "API",
  "IMPORT",
]);
export type MetricSource = z.infer<typeof MetricSource>;

// ===== Experiment Schema =====

export const ExperimentSchema = z.object({
  id: z.string().uuid(),
  opportunity_id: z.string().uuid(),
  title: z.string(),
  experiment_type: ExperimentType.nullable().optional(),
  hypothesis: z.string().nullable().optional(),
  problem: z.string().nullable().optional(),
  solution: z.string().nullable().optional(),
  target_customer: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  success_criteria: z.string().nullable().optional(),
  failure_criteria: z.any().optional(),
  time_window: z.any().optional(),
  estimated_cost_inr: z.number().optional(),
  actual_cost_inr: z.number().optional(),
  cost_classification: z.string().optional(),
  human_actions: z.any().optional(),
  automation_actions: z.any().optional(),
  baseline_metrics: z.any().optional(),
  hypothesis_details: z.any().optional(),
  learning_data: z.any().optional(),
  stage: ExperimentStage,
  status: ExperimentStatus,
  result: z.string().nullable().optional(),
  decision: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

export const CreateExperimentSchema = z.object({
  opportunity_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  experiment_type: ExperimentType.optional(),
  hypothesis: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  target_customer: z.string().optional(),
  channel: z.string().optional(),
  success_criteria: z.string().optional(),
  failure_criteria: z.any().optional(),
  time_window: z.any().optional(),
  estimated_cost_inr: z.number().optional(),
  actual_cost_inr: z.number().optional(),
  cost_classification: z.string().optional(),
  human_actions: z.any().optional(),
  automation_actions: z.any().optional(),
  baseline_metrics: z.any().optional(),
  hypothesis_details: z.any().optional(),
  learning_data: z.any().optional(),
  stage: ExperimentStage.optional(),
  status: ExperimentStatus.optional(),
  result: z.string().optional(),
  decision: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_demo: z.boolean().optional(),
});
export type CreateExperimentInput = z.infer<typeof CreateExperimentSchema>;

export const UpdateExperimentSchema = CreateExperimentSchema.partial().omit({ opportunity_id: true });
export type UpdateExperimentInput = z.infer<typeof UpdateExperimentSchema>;

// ===== Experiment Metric Schema =====

export const ExperimentMetricSchema = z.object({
  id: z.string().uuid(),
  experiment_id: z.string().uuid(),
  metric_name: z.string(),
  metric_value: z.number().nullable().optional(),
  metric_type: z.string().nullable().optional(),
  source: MetricSource.optional(),
  unit: z.string().nullable().optional(),
  recorded_at: z.string(),
  created_at: z.string(),
});
export type ExperimentMetric = z.infer<typeof ExperimentMetricSchema>;

export const CreateMetricInputSchema = z.object({
  experiment_id: z.string().uuid(),
  metric_name: z.string().min(1),
  metric_value: z.number(),
  metric_type: z.string().optional(),
  source: MetricSource.default("MANUAL"),
  unit: z.string().optional(),
  recorded_at: z.string().optional(),
});
export type CreateMetricInput = z.infer<typeof CreateMetricInputSchema>;

// ===== Experiment Job Schema =====

export const ExperimentJobSchema = z.object({
  id: z.string().uuid(),
  experiment_id: z.string().uuid(),
  status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string(),
});
export type ExperimentJob = z.infer<typeof ExperimentJobSchema>;

// ===== Waitlist Entry Schema =====

export const WaitlistEntrySchema = z.object({
  id: z.string().uuid(),
  experiment_id: z.string().uuid(),
  email: z.string().email(),
  source: z.string().optional(),
  metadata: z.any().optional(),
  created_at: z.string(),
});
export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;
