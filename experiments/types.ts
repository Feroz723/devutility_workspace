import type {
  ExperimentType,
  ExperimentStatus,
  ExperimentResult,
  MetricName,
  MetricSource,
} from "@/types/experiment";

export interface HypothesisDetails {
  hypothesis: string;
  assumption: string;
  expected_behavior: string;
  measurement: string;
  success_threshold: string;
  failure_threshold: string;
  target_metrics?: Array<{
    name: MetricName;
    target_value: number;
    unit?: string;
  }>;
}

export interface FailureCondition {
  condition: string;
  threshold?: string;
  triggered?: boolean;
}

export interface LearningData {
  what_happened: string;
  what_worked: string[];
  what_failed: string[];
  customer_response: string;
  channel_response: string;
  conversion_summary: string;
  problems_discovered: string[];
  recommended_next_action: string;
  analyzed_at: string;
}

export interface StateTransitionResult {
  allowed: boolean;
  from: ExperimentStatus;
  to: ExperimentStatus;
  reason?: string;
}

export interface ExecutionGuardResult {
  allowed: boolean;
  classification: "FREE" | "REQUIRES_APPROVAL" | "BLOCKED";
  reason: string;
  requires_human_approval: boolean;
}

export interface CriteriaComparison {
  metric_name: string;
  target_value: number;
  actual_value: number;
  met: boolean;
  unit?: string;
}

export interface ExperimentAnalysisResult {
  result: ExperimentResult;
  decision_summary: string;
  success_criteria_met: boolean;
  stop_condition_triggered: boolean;
  criteria_comparisons: CriteriaComparison[];
  learnings: LearningData;
}

export interface LandingPageData {
  headline: string;
  subheadline: string;
  problem_callout: string;
  solution_highlights: string[];
  target_audience: string;
  cta_text: string;
  waitlist_cta: string;
  tool_type: ExperimentType;
  delivery_note: string;
}
