import { z } from "zod";

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const MetricCategory = z.enum(["FUNNEL", "FINANCIAL", "RETENTION", "SUPPORT", "UNIT", "GENERAL"]);
export type MetricCategory = z.infer<typeof MetricCategory>;

export const MetricUnit = z.enum(["INR", "PERCENT", "COUNT", "SECONDS", "RATIO"]);
export type MetricUnit = z.infer<typeof MetricUnit>;

export const IntelligenceConfidence = z.enum(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"]);
export type IntelligenceConfidence = z.infer<typeof IntelligenceConfidence>;

export const CostStatus = z.enum(["RECORDED_ZERO_COST", "ESTIMATED_COST", "RECORDED_COST", "UNKNOWN_COST"]);
export type CostStatus = z.infer<typeof CostStatus>;

export const ProductPerformanceTier = z.enum([
  "WINNER",
  "PROMISING",
  "STABLE",
  "NEEDS_IMPROVEMENT",
  "WEAK",
  "STOP_CANDIDATE",
  "INSUFFICIENT_DATA",
]);
export type ProductPerformanceTier = z.infer<typeof ProductPerformanceTier>;

export const ChannelPerformanceTier = z.enum([
  "SCALE",
  "MAINTAIN",
  "ITERATE",
  "PAUSE",
  "STOP",
  "INSUFFICIENT_DATA",
]);
export type ChannelPerformanceTier = z.infer<typeof ChannelPerformanceTier>;

export const OfferPerformanceTier = z.enum([
  "STRONG",
  "PROMISING",
  "WEAK",
  "REQUIRES_ITERATION",
  "STOP",
]);
export type OfferPerformanceTier = z.infer<typeof OfferPerformanceTier>;

export const DecisionSubjectType = z.enum([
  "OPPORTUNITY",
  "EXPERIMENT",
  "PRODUCT",
  "CAMPAIGN",
  "OFFER",
  "SYSTEM",
]);
export type DecisionSubjectType = z.infer<typeof DecisionSubjectType>;

export const PortfolioDecisionType = z.enum([
  "BUILD",
  "ITERATE",
  "CONTINUE",
  "SCALE",
  "MAINTAIN",
  "PAUSE",
  "STOP",
  "ARCHIVE",
  "RESEARCH_MORE",
  "REQUIRES_REVIEW",
]);
export type PortfolioDecisionType = z.infer<typeof PortfolioDecisionType>;

export const DecisionStatus = z.enum([
  "PROPOSED",
  "REVIEW",
  "APPROVED",
  "EXECUTING",
  "COMPLETED",
  "REJECTED",
  "PAUSED",
  "CANCELLED",
]);
export type DecisionStatus = z.infer<typeof DecisionStatus>;

export const ForecastType = z.enum([
  "TRAFFIC_TREND",
  "SIGNUP_TREND",
  "CUSTOMER_TREND",
  "REVENUE_TREND",
  "RETENTION_TREND",
]);
export type ForecastType = z.infer<typeof ForecastType>;

export const ResourceCategory = z.enum([
  "PRODUCT_WORK",
  "EXPERIMENTS",
  "DISTRIBUTION",
  "CUSTOMER_SUPPORT",
  "RESEARCH",
]);
export type ResourceCategory = z.infer<typeof ResourceCategory>;

export const BusinessGoalStatus = z.enum([
  "ACTIVE",
  "ACHIEVED",
  "MISSED",
  "PAUSED",
  "CANCELLED",
]);
export type BusinessGoalStatus = z.infer<typeof BusinessGoalStatus>;

export const RiskCategory = z.enum([
  "TECHNICAL_RISK",
  "CUSTOMER_RISK",
  "REVENUE_RISK",
  "RETENTION_RISK",
  "DISTRIBUTION_RISK",
  "DEPENDENCY_RISK",
  "COST_RISK",
  "SECURITY_RISK",
  "COMPLIANCE_RISK",
]);
export type RiskCategory = z.infer<typeof RiskCategory>;

export const RiskSeverity = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskSeverity = z.infer<typeof RiskSeverity>;

export const RiskProbability = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RiskProbability = z.infer<typeof RiskProbability>;

export const RiskStatus = z.enum([
  "OPEN",
  "MONITORING",
  "MITIGATED",
  "ACCEPTED",
  "CLOSED",
]);
export type RiskStatus = z.infer<typeof RiskStatus>;

export const LearningCategory = z.enum([
  "WHAT_WORKED",
  "WHAT_FAILED",
  "PATTERN_DISCOVERED",
  "ASSUMPTION_INVALIDATED",
]);
export type LearningCategory = z.infer<typeof LearningCategory>;

export const BIJobType = z.enum([
  "COLLECT_SNAPSHOT",
  "EVALUATE_PORTFOLIO",
  "DETECT_RISKS",
  "GENERATE_LEARNING",
  "RECOMPUTE_METRICS",
]);
export type BIJobType = z.infer<typeof BIJobType>;

export const BIJobStatus = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]);
export type BIJobStatus = z.infer<typeof BIJobStatus>;

// ==========================================
// SCHEMAS & MODELS
// ==========================================

export const BusinessSnapshotSchema = z.object({
  id: z.string().uuid(),
  snapshot_date: z.string(),
  active_opportunities_count: z.number().int().default(0),
  active_experiments_count: z.number().int().default(0),
  active_products_count: z.number().int().default(0),
  active_campaigns_count: z.number().int().default(0),
  total_visitors_count: z.number().int().default(0),
  total_leads_count: z.number().int().default(0),
  total_signups_count: z.number().int().default(0),
  total_customers_count: z.number().int().default(0),
  activated_customers_count: z.number().int().default(0),
  total_revenue_inr: z.number().default(0),
  total_refunds_inr: z.number().default(0),
  net_revenue_inr: z.number().default(0),
  active_retention_rate_percent: z.number().default(0),
  confirmed_churn_count: z.number().int().default(0),
  open_support_tickets_count: z.number().int().default(0),
  summary_metrics: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type BusinessSnapshot = z.infer<typeof BusinessSnapshotSchema>;

export const BusinessMetricSchema = z.object({
  id: z.string().uuid(),
  metric_name: z.string(),
  metric_category: MetricCategory.default("GENERAL"),
  metric_value: z.number().nullable().optional(),
  metric_unit: MetricUnit.nullable().optional(),
  has_sufficient_data: z.boolean().default(false),
  sample_size: z.number().int().default(0),
  confidence: IntelligenceConfidence.default("INSUFFICIENT_DATA"),
  source_phase: z.string(),
  dimensions: z.record(z.any()).default({}),
  recorded_at: z.string(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type BusinessMetric = z.infer<typeof BusinessMetricSchema>;

export const UnitEconomicsSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  revenue_inr: z.number().default(0),
  cost_inr: z.number().default(0),
  cost_status: CostStatus.default("RECORDED_ZERO_COST"),
  gross_margin_percent: z.number().nullable().optional(),
  customer_acquisition_cost_inr: z.number().nullable().optional(),
  customer_lifetime_value_inr: z.number().nullable().optional(),
  payback_period_days: z.number().nullable().optional(),
  revenue_per_user_inr: z.number().nullable().optional(),
  confidence: IntelligenceConfidence.default("INSUFFICIENT_DATA"),
  has_sufficient_data: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UnitEconomics = z.infer<typeof UnitEconomicsSchema>;

export const ProductPerformanceSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  performance_tier: ProductPerformanceTier.default("INSUFFICIENT_DATA"),
  traffic_count: z.number().int().default(0),
  users_count: z.number().int().default(0),
  customers_count: z.number().int().default(0),
  activation_rate_percent: z.number().default(0),
  revenue_inr: z.number().default(0),
  refund_rate_percent: z.number().default(0),
  retention_rate_percent: z.number().default(0),
  churn_rate_percent: z.number().default(0),
  support_burden_score: z.number().int().default(0),
  feature_requests_count: z.number().int().default(0),
  customer_outcomes_score: z.number().int().default(0),
  evaluation_summary: z.string().nullable().optional(),
  evidence: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProductPerformance = z.infer<typeof ProductPerformanceSchema>;

export const ChannelPerformanceSchema = z.object({
  id: z.string().uuid(),
  channel_type: z.string(),
  campaign_id: z.string().uuid().nullable().optional(),
  performance_tier: ChannelPerformanceTier.default("INSUFFICIENT_DATA"),
  traffic_count: z.number().int().default(0),
  qualified_leads_count: z.number().int().default(0),
  signups_count: z.number().int().default(0),
  customers_count: z.number().int().default(0),
  revenue_inr: z.number().default(0),
  conversion_rate_percent: z.number().default(0),
  effort_score: z.number().int().default(5),
  cost_inr: z.number().default(0),
  retention_quality_score: z.number().int().default(50),
  notes: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ChannelPerformance = z.infer<typeof ChannelPerformanceSchema>;

export const OfferPerformanceSchema = z.object({
  id: z.string().uuid(),
  offer_id: z.string().uuid(),
  performance_tier: OfferPerformanceTier.default("PROMISING"),
  views_count: z.number().int().default(0),
  checkouts_started_count: z.number().int().default(0),
  payments_completed_count: z.number().int().default(0),
  conversion_rate_percent: z.number().default(0),
  refunds_count: z.number().int().default(0),
  refund_rate_percent: z.number().default(0),
  average_order_value_inr: z.number().default(0),
  total_revenue_inr: z.number().default(0),
  repeat_purchases_count: z.number().int().default(0),
  recommendations: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type OfferPerformance = z.infer<typeof OfferPerformanceSchema>;

export const CustomerCohortSchema = z.object({
  id: z.string().uuid(),
  cohort_name: z.string(),
  cohort_type: z.string(),
  dimension_value: z.string(),
  cohort_size: z.number().int().default(0),
  activated_count: z.number().int().default(0),
  retained_30d_count: z.number().int().default(0),
  churned_count: z.number().int().default(0),
  total_revenue_inr: z.number().default(0),
  support_tickets_count: z.number().int().default(0),
  has_sufficient_data: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerCohort = z.infer<typeof CustomerCohortSchema>;

export const PortfolioDecisionSchema = z.object({
  id: z.string().uuid(),
  subject_type: DecisionSubjectType,
  subject_id: z.string().uuid().nullable().optional(),
  subject_name: z.string(),
  decision: PortfolioDecisionType,
  status: DecisionStatus.default("PROPOSED"),
  confidence: IntelligenceConfidence.default("MEDIUM"),
  reasons: z.array(z.string()).default([]),
  metrics_summary: z.record(z.any()).default({}),
  risks: z.array(z.string()).default([]),
  recommended_next_action: z.string(),
  requires_approval: z.boolean().default(true),
  approved_by: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  execution_status: z.string().default("PENDING"),
  execution_result: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PortfolioDecision = z.infer<typeof PortfolioDecisionSchema>;

export const DecisionRecommendationSchema = z.object({
  id: z.string().uuid(),
  decision_id: z.string().uuid(),
  action_type: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.string().default("MEDIUM"),
  expected_impact: z.string().nullable().optional(),
  effort_estimate: z.string().default("LOW"),
  cost_estimate_inr: z.number().default(0),
  requires_approval: z.boolean().default(true),
  status: z.string().default("PENDING"),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type DecisionRecommendation = z.infer<typeof DecisionRecommendationSchema>;

export const DecisionEvidenceSchema = z.object({
  id: z.string().uuid(),
  decision_id: z.string().uuid(),
  evidence_type: z.string(),
  metric_name: z.string(),
  metric_value: z.string(),
  sample_size: z.number().int().default(1),
  source_reference: z.string().nullable().optional(),
  confidence: z.number().int().default(100),
  created_at: z.string(),
});
export type DecisionEvidence = z.infer<typeof DecisionEvidenceSchema>;

export const BusinessForecastSchema = z.object({
  id: z.string().uuid(),
  forecast_type: ForecastType,
  target_metric: z.string(),
  forecast_value: z.number().nullable().optional(),
  projected_change_percent: z.number().nullable().optional(),
  confidence: IntelligenceConfidence.default("INSUFFICIENT_DATA"),
  data_window_days: z.number().int().default(30),
  assumptions: z.array(z.string()).default([]),
  has_sufficient_data: z.boolean().default(false),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type BusinessForecast = z.infer<typeof BusinessForecastSchema>;

export const ResourceAllocationSchema = z.object({
  id: z.string().uuid(),
  category: ResourceCategory,
  allocation_percentage: z.number().int().min(0).max(100).default(20),
  time_hours_per_week: z.number().default(0),
  compute_capacity_level: z.string().default("STANDARD"),
  attention_priority: z.number().int().default(1),
  justification: z.string(),
  cost_inr: z.number().default(0),
  status: z.string().default("ACTIVE"),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ResourceAllocation = z.infer<typeof ResourceAllocationSchema>;

export const BusinessGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  target_value: z.number(),
  current_value: z.number().default(0),
  unit: z.string().default("CUSTOMERS"),
  deadline: z.string().nullable().optional(),
  status: BusinessGoalStatus.default("ACTIVE"),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BusinessGoal = z.infer<typeof BusinessGoalSchema>;

export const BusinessRiskSchema = z.object({
  id: z.string().uuid(),
  category: RiskCategory,
  title: z.string(),
  description: z.string(),
  severity: RiskSeverity.default("MEDIUM"),
  probability: RiskProbability.default("MEDIUM"),
  evidence: z.string().nullable().optional(),
  mitigation: z.string(),
  owner: z.string().default("system"),
  status: RiskStatus.default("OPEN"),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BusinessRisk = z.infer<typeof BusinessRiskSchema>;

export const BusinessLearningSchema = z.object({
  id: z.string().uuid(),
  source_phase: z.string(),
  category: LearningCategory,
  title: z.string(),
  summary: z.string(),
  why: z.string(),
  evidence: z.string(),
  confidence: z.string().default("MEDIUM"),
  recommended_action: z.string(),
  tags: z.array(z.string()).default([]),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type BusinessLearning = z.infer<typeof BusinessLearningSchema>;

export const BusinessJobSchema = z.object({
  id: z.string().uuid(),
  job_type: BIJobType,
  status: BIJobStatus.default("PENDING"),
  payload: z.record(z.any()).default({}),
  result: z.record(z.any()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
});
export type BusinessJob = z.infer<typeof BusinessJobSchema>;

export const BusinessEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  entity_type: z.string(),
  entity_id: z.string().uuid().nullable().optional(),
  details: z.record(z.any()).default({}),
  created_at: z.string(),
});
export type BusinessEvent = z.infer<typeof BusinessEventSchema>;
