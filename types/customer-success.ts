import { z } from "zod";

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const JourneyStage = z.enum([
  "VISITOR",
  "LEAD",
  "CHECKOUT",
  "CUSTOMER",
  "ACTIVATING",
  "ACTIVE",
  "SUCCESSFUL",
  "AT_RISK",
  "DORMANT",
  "CHURNED",
]);
export type JourneyStage = z.infer<typeof JourneyStage>;

export const CustomerEventType = z.enum([
  "SIGNUP",
  "FIRST_ACCESS",
  "FIRST_ACTION",
  "FIRST_VALUE",
  "FEATURE_USED",
  "TASK_COMPLETED",
  "DOWNLOAD",
  "EXPORT",
  "SHARE",
  "RETURN_VISIT",
  "SESSION_STARTED",
  "SESSION_ENDED",
  "SUPPORT_REQUESTED",
  "FEEDBACK_SUBMITTED",
  "GOAL_COMPLETED",
  "SUBSCRIPTION_RENEWED",
  "SUBSCRIPTION_CANCELLED",
]);
export type CustomerEventType = z.infer<typeof CustomerEventType>;

export const ActivationStatus = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "ACTIVATED",
  "STALLED",
  "FAILED",
]);
export type ActivationStatus = z.infer<typeof ActivationStatus>;

export const GoalCompletionStatus = z.enum([
  "IN_PROGRESS",
  "ACHIEVED",
  "PARTIALLY_ACHIEVED",
  "ABANDONED",
  "FAILED",
]);
export type GoalCompletionStatus = z.infer<typeof GoalCompletionStatus>;

export const CustomerHealthStatus = z.enum([
  "HEALTHY",
  "AT_RISK",
  "DORMANT",
  "CHURNED",
  "UNKNOWN",
]);
export type CustomerHealthStatus = z.infer<typeof CustomerHealthStatus>;

export const FeedbackType = z.enum([
  "SATISFACTION",
  "NPS",
  "CSAT",
  "DIFFICULTY",
  "BUG",
  "FEATURE_REQUEST",
  "PRAISE",
  "COMPLAINT",
  "CHURN_REASON",
]);
export type FeedbackType = z.infer<typeof FeedbackType>;

export const Sentiment = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]);
export type Sentiment = z.infer<typeof Sentiment>;

export const SupportCategory = z.enum([
  "ACCESS",
  "PAYMENT",
  "DELIVERY",
  "BUG",
  "USAGE",
  "FEATURE_REQUEST",
  "OTHER",
]);
export type SupportCategory = z.infer<typeof SupportCategory>;

export const SupportSeverity = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type SupportSeverity = z.infer<typeof SupportSeverity>;

export const SupportStatus = z.enum([
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
]);
export type SupportStatus = z.infer<typeof SupportStatus>;

export const SupportSenderType = z.enum(["CUSTOMER", "AGENT", "AI_ASSISTANT", "SYSTEM"]);
export type SupportSenderType = z.infer<typeof SupportSenderType>;

export const InterventionType = z.enum([
  "ONBOARDING_REMINDER",
  "USAGE_GUIDANCE",
  "HELP_ARTICLE",
  "TROUBLESHOOTING",
  "FEATURE_EXPLANATION",
  "FEEDBACK_REQUEST",
  "SUPPORT_ESCALATION",
  "MANUAL_FOLLOW_UP",
]);
export type InterventionType = z.infer<typeof InterventionType>;

export const InterventionUrgency = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type InterventionUrgency = z.infer<typeof InterventionUrgency>;

export const InterventionChannel = z.enum(["EMAIL", "IN_APP", "MANUAL"]);
export type InterventionChannel = z.infer<typeof InterventionChannel>;

export const InterventionStatus = z.enum([
  "PROPOSED",
  "APPROVED",
  "SCHEDULED",
  "SENT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REQUIRES_MANUAL_ACTION",
]);
export type InterventionStatus = z.infer<typeof InterventionStatus>;

export const ChurnStatus = z.enum(["CHURN_RISK", "CONFIRMED_CHURN"]);
export type ChurnStatus = z.infer<typeof ChurnStatus>;

export const ChurnReason = z.enum([
  "INACTIVITY",
  "CANCELLATION",
  "PRODUCT_DISSATISFACTION",
  "ENTITLEMENT_EXPIRED",
  "REPEATED_BUGS",
  "OTHER",
]);
export type ChurnReason = z.infer<typeof ChurnReason>;

export const CSJobType = z.enum([
  "CALCULATE_HEALTH",
  "AGGREGATE_RETENTION",
  "DETECT_CHURN",
  "GENERATE_INTERVENTIONS",
  "TRIAGE_SUPPORT",
  "ANALYZE_FEEDBACK",
  "GENERATE_LEARNING",
]);
export type CSJobType = z.infer<typeof CSJobType>;

export const CSJobStatus = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]);
export type CSJobStatus = z.infer<typeof CSJobStatus>;

// ==========================================
// SCHEMAS & MODELS
// ==========================================

export const CustomerProfileSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  journey_stage: JourneyStage,
  unsubscribed: z.boolean().default(false),
  communication_opt_in: z.boolean().default(true),
  daily_message_limit: z.number().int().default(2),
  weekly_message_limit: z.number().int().default(5),
  preferred_channel: z.string().default("EMAIL"),
  timezone: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;

export const CustomerSessionSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  session_token: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
  duration_seconds: z.number().int().default(0),
  page_views_count: z.number().int().default(0),
  actions_count: z.number().int().default(0),
  device_type: z.string().nullable().optional(),
  browser: z.string().nullable().optional(),
  ip_address_hash: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type CustomerSession = z.infer<typeof CustomerSessionSchema>;

export const CustomerEventSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  session_id: z.string().uuid().nullable().optional(),
  event_type: CustomerEventType,
  event_name: z.string(),
  properties: z.record(z.any()).default({}),
  source: z.string().default("IN_APP"),
  confidence: z.number().int().default(100),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type CustomerEvent = z.infer<typeof CustomerEventSchema>;

export const CustomerActivationSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  status: ActivationStatus,
  activation_started_at: z.string().nullable().optional(),
  activation_completed_at: z.string().nullable().optional(),
  time_to_value_seconds: z.number().int().nullable().optional(),
  first_action_name: z.string().nullable().optional(),
  first_value_name: z.string().nullable().optional(),
  milestones_total: z.number().int().default(0),
  milestones_completed: z.number().int().default(0),
  details: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerActivation = z.infer<typeof CustomerActivationSchema>;

export const CustomerGoalSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  expected_outcome: z.string().nullable().optional(),
  completion_status: GoalCompletionStatus,
  progress_percent: z.number().int().default(0),
  target_date: z.string().nullable().optional(),
  achieved_at: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerGoal = z.infer<typeof CustomerGoalSchema>;

export const CustomerMilestoneSchema = z.object({
  id: z.string().uuid(),
  goal_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  name: z.string(),
  sequence_order: z.number().int().default(1),
  is_completed: z.boolean().default(false),
  completed_at: z.string().nullable().optional(),
  evidence: z.record(z.any()).default({}),
  created_at: z.string(),
});
export type CustomerMilestone = z.infer<typeof CustomerMilestoneSchema>;

export const CustomerHealthSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  health_score: z.number().int().min(0).max(100).default(50),
  status: CustomerHealthStatus,
  recency_score: z.number().int().default(50),
  frequency_score: z.number().int().default(50),
  activation_score: z.number().int().default(50),
  support_score: z.number().int().default(50),
  factors: z.record(z.any()).default({}),
  signals: z.array(z.any()).default([]),
  last_evaluated_at: z.string(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerHealth = z.infer<typeof CustomerHealthSchema>;

export const CustomerFeedbackSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  feedback_type: FeedbackType,
  score: z.number().int().nullable().optional(),
  comment: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  sentiment: Sentiment.nullable().optional(),
  source: z.string().default("IN_APP"),
  confidence: z.number().int().default(100),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type CustomerFeedback = z.infer<typeof CustomerFeedbackSchema>;

export const CustomerSupportRequestSchema = z.object({
  id: z.string().uuid(),
  ticket_number: z.string(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  subject: z.string(),
  description: z.string(),
  category: SupportCategory,
  severity: SupportSeverity,
  status: SupportStatus,
  assigned_to: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  resolution_time_seconds: z.number().int().nullable().optional(),
  ai_suggested_category: z.string().nullable().optional(),
  ai_suggested_response: z.string().nullable().optional(),
  ai_confidence: z.number().int().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerSupportRequest = z.infer<typeof CustomerSupportRequestSchema>;

export const CustomerSupportMessageSchema = z.object({
  id: z.string().uuid(),
  support_request_id: z.string().uuid(),
  sender_type: SupportSenderType,
  sender_name: z.string().nullable().optional(),
  body: z.string(),
  attachments: z.array(z.any()).default([]),
  created_at: z.string(),
});
export type CustomerSupportMessage = z.infer<typeof CustomerSupportMessageSchema>;

export const CustomerInterventionSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  intervention_type: InterventionType,
  reason: z.string(),
  evidence: z.record(z.any()).default({}),
  recommended_action: z.string(),
  urgency: InterventionUrgency,
  channel: InterventionChannel,
  requires_approval: z.boolean().default(true),
  status: InterventionStatus,
  approved_at: z.string().nullable().optional(),
  approved_by: z.string().nullable().optional(),
  executed_at: z.string().nullable().optional(),
  execution_result: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerIntervention = z.infer<typeof CustomerInterventionSchema>;

export const CustomerOnboardingSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      completed: z.boolean(),
      completed_at: z.string().nullable().optional(),
    })
  ).default([]),
  current_step_index: z.number().int().default(0),
  is_completed: z.boolean().default(false),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerOnboarding = z.infer<typeof CustomerOnboardingSchema>;

export const CustomerRetentionSchema = z.object({
  id: z.string().uuid(),
  cohort_date: z.string(),
  product_id: z.string().uuid().nullable().optional(),
  cohort_size: z.number().int().default(0),
  day_1_retained: z.number().int().default(0),
  day_7_retained: z.number().int().default(0),
  day_14_retained: z.number().int().default(0),
  day_30_retained: z.number().int().default(0),
  weekly_active_customers: z.number().int().default(0),
  monthly_active_customers: z.number().int().default(0),
  repeat_usage_rate_percent: z.number().default(0),
  has_sufficient_data: z.boolean().default(false),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type CustomerRetention = z.infer<typeof CustomerRetentionSchema>;

export const CustomerChurnSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  churn_status: ChurnStatus,
  risk_score: z.number().int().min(0).max(100).default(50),
  primary_reason: z.string().nullable().optional(),
  signals: z.array(z.any()).default([]),
  confirmed_at: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CustomerChurn = z.infer<typeof CustomerChurnSchema>;

export const CustomerSuccessJobSchema = z.object({
  id: z.string().uuid(),
  job_type: CSJobType,
  status: CSJobStatus,
  payload: z.record(z.any()).default({}),
  result: z.record(z.any()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
});
export type CustomerSuccessJob = z.infer<typeof CustomerSuccessJobSchema>;

export const CustomerSuccessEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  customer_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  details: z.record(z.any()).default({}),
  created_at: z.string(),
});
export type CustomerSuccessEvent = z.infer<typeof CustomerSuccessEventSchema>;
