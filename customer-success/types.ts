import type {
  CustomerProfile,
  CustomerSession,
  CustomerEvent,
  CustomerActivation,
  CustomerGoal,
  CustomerMilestone,
  CustomerHealth,
  CustomerFeedback,
  CustomerSupportRequest,
  CustomerSupportMessage,
  CustomerIntervention,
  CustomerOnboarding,
  CustomerRetention,
  CustomerChurn,
  JourneyStage,
  CustomerEventType,
  ActivationStatus,
  GoalCompletionStatus,
  CustomerHealthStatus,
  FeedbackType,
  SupportCategory,
  SupportSeverity,
  SupportStatus,
  InterventionType,
  InterventionStatus,
  ChurnStatus,
} from "@/types/customer-success";

export interface EventIngestionRequest {
  customer_id: string;
  product_id?: string | null;
  session_token?: string | null;
  event_type: CustomerEventType;
  event_name: string;
  properties?: Record<string, unknown>;
  source?: string;
  confidence?: number;
  is_demo?: boolean;
}

export interface IngestionResult {
  success: boolean;
  event_id?: string;
  journey_stage_updated?: boolean;
  new_stage?: JourneyStage;
  activation_status?: ActivationStatus;
  health_updated?: boolean;
  error?: string;
}

export interface HealthScoreFactors {
  recency_days: number;
  sessions_last_7d: number;
  events_last_7d: number;
  activation_completed: boolean;
  open_critical_tickets: number;
  negative_feedback_count: number;
}

export interface HealthCalculationResult {
  health_score: number;
  status: CustomerHealthStatus;
  recency_score: number;
  frequency_score: number;
  activation_score: number;
  support_score: number;
  factors: HealthScoreFactors;
  signals: string[];
}

export interface ChurnDetectionResult {
  churn_status: ChurnStatus;
  risk_score: number;
  primary_reason: string;
  signals: string[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string | null;
}

export interface EmailProviderStatus {
  provider_name: string;
  status: "CONNECTED" | "NOT_CONNECTED" | "REQUIRES_MANUAL_SETUP" | "REQUIRES_APPROVAL";
  details: string;
  config_guide: string[];
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  customer_id: string;
  intervention_id?: string;
}

export interface SendEmailResult {
  success: boolean;
  status: "SENT" | "QUEUED_MANUAL" | "FAILED" | "BLOCKED_SAFETY";
  provider: string;
  message_id?: string;
  reason?: string;
}

export interface ProductLearningSignal {
  product_id: string;
  signal_type: "USABILITY_FRICTION" | "FEATURE_GAP" | "BUG_CLUSTER" | "SUCCESS_PATTERN";
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  evidence_count: number;
  recommended_spec_action: string;
  status: "REQUIRES_REVIEW";
}
