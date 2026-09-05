import { z } from "zod";

// ===== Channel Enums =====

export const ChannelType = z.enum([
  // Phase 7 Supported Channel Types
  "OWNED_WEBSITE",
  "SEO",
  "GITHUB",
  "GITHUB_DISCUSSIONS",
  "GITHUB_ISSUES",
  "REDDIT",
  "HACKER_NEWS",
  "PRODUCT_DIRECTORY",
  "COMMUNITY",
  "BLOG",
  "EMAIL",
  "SOCIAL_MEDIA",
  "LINKEDIN",
  "X",
  "INSTAGRAM",
  "YOUTUBE",
  "MANUAL_OUTREACH",
  // Legacy types
  "social",
  "seo",
  "email",
  "marketplace",
  "community",
  "other",
]);
export type ChannelType = z.infer<typeof ChannelType>;

export const ConnectionStatus = z.enum([
  "NOT_CONNECTED",
  "CONNECTED",
  "EXPIRED",
  "FAILED",
  "DISABLED",
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatus>;

export const AutomationCapability = z.enum([
  "FULL_AUTO",
  "ASSISTED",
  "MANUAL",
  "NOT_SUPPORTED",
]);
export type AutomationCapability = z.infer<typeof AutomationCapability>;

// ===== Campaign Enums =====

export const CampaignStatus = z.enum([
  "DRAFT",
  "READY",
  "APPROVED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "ANALYZING",
  "WINNER",
  "PROMISING",
  "ITERATE",
  "STOPPED",
  "FAILED",
]);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

// ===== Content Enums =====

export const ContentType = z.enum([
  "PRODUCT_ANNOUNCEMENT",
  "EDUCATIONAL_ARTICLE",
  "PROBLEM_SOLUTION_ARTICLE",
  "TUTORIAL",
  "COMPARISON",
  "GITHUB_README",
  "CHANGELOG",
  "COMMUNITY_POST",
  "SOCIAL_POST",
  "VIDEO_SCRIPT",
  "YOUTUBE_DESCRIPTION",
  "EMAIL_DRAFT",
  "DIRECTORY_LISTING",
  "FAQ",
  "DOCUMENTATION",
  "SEO_LANDING_PAGE",
]);
export type ContentType = z.infer<typeof ContentType>;

// ===== Queue Enums =====

export const QueueStatus = z.enum([
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
  "BLOCKED",
  "REQUIRES_MANUAL_ACTION",
]);
export type QueueStatus = z.infer<typeof QueueStatus>;

// ===== Lead Enums =====

export const LeadStatus = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "UNSUBSCRIBED",
  "REJECTED",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

// ===== Metric Enums =====

export const MetricSource = z.enum([
  "MANUAL",
  "WEBSITE",
  "ANALYTICS",
  "API",
  "IMPORT",
]);
export type MetricSource = z.infer<typeof MetricSource>;

// ===== Job Enums =====

export const JobType = z.enum([
  "PLANNING",
  "ASSET_GENERATION",
  "PUBLICATION",
  "METRIC_COLLECTION",
  "ANALYSIS",
  "OPTIMIZATION",
]);
export type JobType = z.infer<typeof JobType>;

export const JobStatus = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type JobStatus = z.infer<typeof JobStatus>;

// ==========================================
// SCHEMAS
// ==========================================

// 1. Distribution Channel
export const DistributionChannelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  channel_type: ChannelType,
  platform: z.string(),
  status: z.enum(["planned", "active", "paused", "disabled"]).default("planned"),
  config: z.record(z.unknown()).default({}),
  connection_status: ConnectionStatus.default("NOT_CONNECTED"),
  automation_capability: AutomationCapability.default("MANUAL"),
  credentials_required: z.boolean().default(true),
  manual_setup_required: z.boolean().default(true),
  approval_required: z.boolean().default(true),
  cost_inr: z.number().default(0),
  daily_action_limit: z.number().int().default(5),
  hourly_action_limit: z.number().int().default(2),
  policy_constraints: z.record(z.unknown()).default({}),
  supported_content_types: z.array(z.string()).default([]),
  connection_details: z.record(z.unknown()).default({}),
  last_connection_test_at: z.string().nullable().optional(),
  last_connection_error: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DistributionChannel = z.infer<typeof DistributionChannelSchema>;

export const CreateDistributionChannelSchema = z.object({
  name: z.string().min(1),
  channel_type: ChannelType,
  platform: z.string().min(1),
  status: z.enum(["planned", "active", "paused", "disabled"]).optional(),
  config: z.record(z.unknown()).optional(),
  connection_status: ConnectionStatus.optional(),
  automation_capability: AutomationCapability.optional(),
  credentials_required: z.boolean().optional(),
  manual_setup_required: z.boolean().optional(),
  approval_required: z.boolean().optional(),
  cost_inr: z.number().optional(),
  daily_action_limit: z.number().int().optional(),
  hourly_action_limit: z.number().int().optional(),
  policy_constraints: z.record(z.unknown()).optional(),
  supported_content_types: z.array(z.string()).optional(),
  connection_details: z.record(z.unknown()).optional(),
  last_connection_test_at: z.string().nullable().optional(),
  last_connection_error: z.string().nullable().optional(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionChannelInput = z.infer<typeof CreateDistributionChannelSchema>;

export const UpdateDistributionChannelSchema = CreateDistributionChannelSchema.partial();
export type UpdateDistributionChannelInput = z.infer<typeof UpdateDistributionChannelSchema>;

// 2. Distribution Strategy
export const DistributionStrategySchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  target_audience: z.string(),
  value_hook: z.string(),
  ranked_channels: z.array(z.record(z.unknown())).default([]),
  estimated_cost_inr: z.number().default(0),
  frequency_rules: z.record(z.unknown()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DistributionStrategy = z.infer<typeof DistributionStrategySchema>;

export const CreateDistributionStrategySchema = z.object({
  product_id: z.string().uuid(),
  target_audience: z.string().min(1),
  value_hook: z.string().min(1),
  ranked_channels: z.array(z.record(z.unknown())).optional(),
  estimated_cost_inr: z.number().optional(),
  frequency_rules: z.record(z.unknown()).optional(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionStrategyInput = z.infer<typeof CreateDistributionStrategySchema>;

// 3. Distribution Campaign
export const DistributionCampaignSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  strategy_id: z.string().uuid().nullable().optional(),
  primary_channel_id: z.string().uuid().nullable().optional(),
  name: z.string(),
  slug: z.string(),
  status: CampaignStatus.default("DRAFT"),
  budget_inr: z.number().default(0),
  actual_spend_inr: z.number().default(0),
  target_metrics: z.record(z.unknown()).default({}),
  actual_metrics: z.record(z.unknown()).default({}),
  learnings: z.record(z.unknown()).default({}),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DistributionCampaign = z.infer<typeof DistributionCampaignSchema>;

export const CreateDistributionCampaignSchema = z.object({
  product_id: z.string().uuid(),
  strategy_id: z.string().uuid().optional().nullable(),
  primary_channel_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  slug: z.string().optional(),
  status: CampaignStatus.optional(),
  budget_inr: z.number().optional(),
  target_metrics: z.record(z.unknown()).optional(),
  actual_metrics: z.record(z.unknown()).optional(),
  learnings: z.record(z.unknown()).optional(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionCampaignInput = z.infer<typeof CreateDistributionCampaignSchema>;

export const UpdateDistributionCampaignSchema = CreateDistributionCampaignSchema.partial();
export type UpdateDistributionCampaignInput = z.infer<typeof UpdateDistributionCampaignSchema>;

// 4. Distribution Asset
export const DistributionAssetSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  campaign_id: z.string().uuid().nullable().optional(),
  channel_type: ChannelType,
  content_type: ContentType,
  title: z.string().nullable().optional(),
  body: z.string(),
  metadata: z.record(z.unknown()).default({}),
  fact_claims: z.array(z.string()).default([]),
  inference_notes: z.array(z.string()).default([]),
  marketing_copy: z.array(z.string()).default([]),
  approval_status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).default("DRAFT"),
  tracking_url: z.string().nullable().optional(),
  canonical_url: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DistributionAsset = z.infer<typeof DistributionAssetSchema>;

export const CreateDistributionAssetSchema = z.object({
  product_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional().nullable(),
  channel_type: ChannelType,
  content_type: ContentType,
  title: z.string().optional().nullable(),
  body: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  fact_claims: z.array(z.string()).optional(),
  inference_notes: z.array(z.string()).optional(),
  marketing_copy: z.array(z.string()).optional(),
  approval_status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
  tracking_url: z.string().optional().nullable(),
  canonical_url: z.string().optional().nullable(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionAssetInput = z.infer<typeof CreateDistributionAssetSchema>;

export const UpdateDistributionAssetSchema = CreateDistributionAssetSchema.partial();
export type UpdateDistributionAssetInput = z.infer<typeof UpdateDistributionAssetSchema>;

// 5. Distribution Queue
export const DistributionQueueItemSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  status: QueueStatus.default("DRAFT"),
  priority: z.number().int().default(5),
  scheduled_at: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  retry_count: z.number().int().default(0),
  max_retries: z.number().int().default(3),
  idempotency_key: z.string(),
  error_message: z.string().nullable().optional(),
  manual_action_required: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DistributionQueueItem = z.infer<typeof DistributionQueueItemSchema>;

export const CreateDistributionQueueItemSchema = z.object({
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  status: QueueStatus.optional(),
  priority: z.number().int().optional(),
  scheduled_at: z.string().optional().nullable(),
  idempotency_key: z.string().min(1),
  manual_action_required: z.string().optional().nullable(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionQueueItemInput = z.infer<typeof CreateDistributionQueueItemSchema>;

export const UpdateDistributionQueueItemSchema = z.object({
  status: QueueStatus.optional(),
  priority: z.number().int().optional(),
  scheduled_at: z.string().optional().nullable(),
  published_at: z.string().optional().nullable(),
  retry_count: z.number().int().optional(),
  error_message: z.string().optional().nullable(),
  manual_action_required: z.string().optional().nullable(),
});
export type UpdateDistributionQueueItemInput = z.infer<typeof UpdateDistributionQueueItemSchema>;

// 6. Distribution Publication
export const DistributionPublicationSchema = z.object({
  id: z.string().uuid(),
  queue_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  external_publication_id: z.string().nullable().optional(),
  external_url: z.string().nullable().optional(),
  status: z.enum(["PUBLISHED", "REMOVED", "FLAGGED"]).default("PUBLISHED"),
  published_at: z.string(),
  metadata: z.record(z.unknown()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type DistributionPublication = z.infer<typeof DistributionPublicationSchema>;

export const CreateDistributionPublicationSchema = z.object({
  queue_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  external_publication_id: z.string().optional().nullable(),
  external_url: z.string().optional().nullable(),
  status: z.enum(["PUBLISHED", "REMOVED", "FLAGGED"]).optional(),
  published_at: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionPublicationInput = z.infer<typeof CreateDistributionPublicationSchema>;

// 7. Distribution Metric
export const DistributionMetricSchema = z.object({
  id: z.string().uuid(),
  publication_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  metric_name: z.string(),
  metric_value: z.number(),
  source: MetricSource,
  confidence: z.number().int().min(0).max(100).default(100),
  recorded_at: z.string(),
  raw_payload: z.record(z.unknown()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type DistributionMetric = z.infer<typeof DistributionMetricSchema>;

export const CreateDistributionMetricSchema = z.object({
  publication_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  metric_name: z.string().min(1),
  metric_value: z.number(),
  source: MetricSource,
  confidence: z.number().int().min(0).max(100).optional(),
  recorded_at: z.string().optional(),
  raw_payload: z.record(z.unknown()).optional(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionMetricInput = z.infer<typeof CreateDistributionMetricSchema>;

// 8. Distribution Lead
export const DistributionLeadSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid().nullable().optional(),
  publication_id: z.string().uuid().nullable().optional(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  source: z.string(),
  qualification_score: z.number().int().min(0).max(100).default(50),
  status: LeadStatus.default("NEW"),
  notes: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DistributionLead = z.infer<typeof DistributionLeadSchema>;

export const CreateDistributionLeadSchema = z.object({
  campaign_id: z.string().uuid(),
  channel_id: z.string().uuid().optional().nullable(),
  publication_id: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  name: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  source: z.string().min(1),
  qualification_score: z.number().int().min(0).max(100).optional(),
  status: LeadStatus.optional(),
  notes: z.string().optional().nullable(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionLeadInput = z.infer<typeof CreateDistributionLeadSchema>;

export const UpdateDistributionLeadSchema = CreateDistributionLeadSchema.partial();
export type UpdateDistributionLeadInput = z.infer<typeof UpdateDistributionLeadSchema>;

// 9. Distribution Attribution
export const DistributionAttributionSchema = z.object({
  id: z.string().uuid(),
  tracking_token: z.string(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
  utm_term: z.string().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  channel_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
  publication_id: z.string().uuid().nullable().optional(),
  visits_count: z.number().int().default(0),
  clicks_count: z.number().int().default(0),
  signups_count: z.number().int().default(0),
  conversions_count: z.number().int().default(0),
  last_visit_at: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type DistributionAttribution = z.infer<typeof DistributionAttributionSchema>;

export const CreateDistributionAttributionSchema = z.object({
  tracking_token: z.string().min(1),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  channel_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  publication_id: z.string().uuid().optional().nullable(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionAttributionInput = z.infer<typeof CreateDistributionAttributionSchema>;

// 10. Distribution Job
export const DistributionJobSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  job_type: JobType,
  status: JobStatus.default("PENDING"),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  logs: z.array(z.record(z.unknown())).default([]),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
});
export type DistributionJob = z.infer<typeof DistributionJobSchema>;

export const CreateDistributionJobSchema = z.object({
  campaign_id: z.string().uuid(),
  job_type: JobType,
  status: JobStatus.optional(),
  started_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  logs: z.array(z.record(z.unknown())).optional(),
  is_demo: z.boolean().optional(),
});
export type CreateDistributionJobInput = z.infer<typeof CreateDistributionJobSchema>;

export const UpdateDistributionJobSchema = z.object({
  status: JobStatus.optional(),
  started_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  logs: z.array(z.record(z.unknown())).optional(),
});
export type UpdateDistributionJobInput = z.infer<typeof UpdateDistributionJobSchema>;

// 11. Distribution Event
export const DistributionEventSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid(),
  event_type: z.string(),
  details: z.record(z.unknown()).default({}),
  duration_ms: z.number().int().nullable().optional(),
  created_at: z.string(),
});
export type DistributionEvent = z.infer<typeof DistributionEventSchema>;

export const CreateDistributionEventSchema = z.object({
  job_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid(),
  event_type: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  duration_ms: z.number().int().optional().nullable(),
});
export type CreateDistributionEventInput = z.infer<typeof CreateDistributionEventSchema>;
