import type {
  ChannelType,
  ConnectionStatus,
  AutomationCapability,
  CampaignStatus,
  ContentType,
  QueueStatus,
  LeadStatus,
  MetricSource,
  DistributionChannel,
  DistributionStrategy,
  DistributionCampaign,
  DistributionAsset,
  DistributionQueueItem,
  DistributionPublication,
  DistributionMetric,
  DistributionLead,
  DistributionAttribution,
} from "@/types/distribution";
import type { Product } from "@/types/product";
import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";

// Capabilities descriptor
export interface ChannelCapabilityInfo {
  channel_type: ChannelType;
  platform: string;
  name: string;
  automation_capability: AutomationCapability;
  supported_content_types: ContentType[];
  credentials_required: boolean;
  manual_setup_required: boolean;
  approval_required: boolean;
  daily_action_limit: number;
  hourly_action_limit: number;
  allowed_actions: string[];
  manual_setup_instructions: string[];
  policy_notes: string[];
}

// Ranked evaluation for strategy
export interface RankedChannelEvaluation {
  channel_type: ChannelType;
  platform: string;
  name: string;
  total_score: number; // 0 to 100
  priority: number; // 1 (highest) to N
  audience_fit: number;
  problem_intent: number;
  reach_potential: number;
  competition: number;
  effort: number;
  cost_inr: number;
  automation_level: AutomationCapability;
  approval_required: boolean;
  learning_value: number;
  recommended_content_types: ContentType[];
  frequency_limit: string;
  selection_reason: string;
}

// Strategy plan output
export interface DistributionStrategyPlan {
  product_id: string;
  target_audience: string;
  core_problem: string;
  value_hook: string;
  ranked_channels: RankedChannelEvaluation[];
  estimated_total_cost_inr: number;
  approval_boundary_notes: string[];
  zero_cost_verified: boolean;
}

// Content generation prompt & result
export interface ContentGenerationPrompt {
  product: Product;
  channel_type: ChannelType;
  content_type: ContentType;
  target_audience: string;
  tracking_url?: string;
  canonical_url?: string;
  experiment?: Experiment | null;
  opportunity?: Opportunity | null;
}

export interface GeneratedContentAsset {
  channel_type: ChannelType;
  content_type: ContentType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  fact_claims: string[];
  inference_notes: string[];
  marketing_copy: string[];
  approval_required: boolean;
  tracking_url?: string;
  canonical_url?: string;
}

// Safety & Zero-Cost result
export interface ZeroCostDistributionCheck {
  compliant: boolean;
  estimatedCostInr: number;
  flaggedItems: string[];
  notes: string[];
}

export interface AntiSpamCheckResult {
  passed: boolean;
  risk_score: number; // 0 to 100
  reasons: string[];
  blocked_actions: string[];
  content_hash: string;
}

// Channel Performance & Analysis
export type ChannelPerformanceClassification =
  | "WINNING"
  | "PROMISING"
  | "ITERATE"
  | "WEAK"
  | "STOP";

export interface ChannelPerformanceEvaluation {
  channel_type: ChannelType;
  classification: ChannelPerformanceClassification;
  total_impressions: number;
  total_clicks: number;
  total_visitors: number;
  total_signups: number;
  total_leads: number;
  click_through_rate: number; // percentage
  signup_conversion_rate: number; // percentage
  lead_conversion_rate: number; // percentage
  effort_rating: number; // 1 to 5
  cost_inr: number;
  learning_insights: string[];
  action_recommendation: "SCALE" | "MAINTAIN" | "ADJUST_COPY" | "PAUSE" | "STOP";
}

export interface CampaignAnalysisReport {
  campaign_id: string;
  overall_classification: ChannelPerformanceClassification;
  channel_evaluations: ChannelPerformanceEvaluation[];
  summary: string;
  learnings: Record<string, unknown>;
  recommended_next_actions: string[];
}

// Manual Action Item representation
export interface ManualActionItem {
  id: string;
  category: "CREDENTIAL_SETUP" | "PLATFORM_VERIFICATION" | "MANUAL_PUBLISH" | "CONTENT_APPROVAL" | "LEAD_OUTREACH";
  title: string;
  channel: string;
  why_needed: string;
  exact_requirements: string[];
  current_status: ConnectionStatus | QueueStatus | "PENDING";
  action_url?: string;
  draft_content?: string;
  next_software_step: string;
  queue_item_id?: string;
  channel_id?: string;
}

// Runner Options & Results
export interface RunnerOptions {
  campaign_id: string;
  product_id?: string;
  force_refresh?: boolean;
}

export interface RunnerResult {
  success: boolean;
  campaign_id: string;
  status: CampaignStatus;
  assets_prepared: number;
  actions_queued: number;
  manual_actions_required: number;
  auto_published: number;
  message: string;
  error?: string;
}
