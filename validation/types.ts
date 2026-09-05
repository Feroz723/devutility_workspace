import { z } from "zod";
import type { OpportunityDecision, ValidationStatus } from "@/types/opportunity";

export type WtpLevel = "STRONG" | "MODERATE" | "WEAK" | "NONE";

export interface WtpSignal {
  type: string;
  evidence_text: string;
  source?: string;
  source_url?: string;
  strength: "HIGH" | "MEDIUM" | "LOW";
}

export interface WtpClassification {
  level: WtpLevel;
  score: number; // 0–100
  signals: WtpSignal[];
  summary: string;
}

export interface PersonaPainPoint {
  pain: string;
  intensity: "CRITICAL" | "MODERATE" | "MILD";
  nature: "EVIDENCE" | "INFERENCE";
  source_snippet?: string;
}

export interface CustomerProfile {
  target_segment: string;
  archetype: string;
  pain_points: PersonaPainPoint[];
  daily_workflow: string;
  trigger_event: string;
  budget_capacity: "ENTERPRISE" | "SMB" | "PROSUMER" | "FREE_ONLY";
  clarity_score: number; // 0–100
}

export interface CompetitorItem {
  name: string;
  pricing_model: string; // e.g. "$29/mo", "Freemium", "Open-source", "Unknown"
  strengths: string[];
  weaknesses: string[];
  missing_features: string[];
  differentiation_angle: string;
}

export interface ProposedSolution {
  product_type: "MICRO_SAAS" | "API_TOOL" | "DIGITAL_TEMPLATE" | "DATA_FEED" | "AUTOMATION_SCRIPT";
  core_value_prop: string;
  min_features: string[];
  time_to_build_days: number;
  delivery_format: string;
  automation_feasibility: number; // 0–100
}

export interface ExperimentAction {
  step: number;
  description: string;
  cost_inr: number;
  tool: string;
}

export interface ExperimentProposal {
  test_type: "WAITLIST_LANDING_PAGE" | "OUTREACH_CAMPAIGN" | "COMMUNITY_POST" | "MANUAL_CONCIERGE";
  channel: string;
  cost_estimate_inr: number; // Must be 0 for zero-cost test candidates
  hypothesis: string;
  primary_metric: string;
  target_metric_value: string;
  duration_days: number;
  step_by_step_plan: ExperimentAction[];
}

export interface CategoryValidationScore {
  category: string;
  weight: number;
  score: number;
  weighted_score: number;
  rationale: string;
}

export interface PreconditionsCheck {
  is_candidate: boolean;
  score_precondition: boolean; // overall_opportunity_score >= 80
  confidence_precondition: boolean; // research_confidence >= 60
  validation_precondition: boolean; // validation_score >= 70
  source_count_precondition: boolean; // source_count >= 2
  direct_evidence_precondition: boolean; // direct_evidence_count >= 1
  zero_cost_precondition: boolean; // zero_cost_score >= 50 AND cost_estimate_inr == 0
  spend_policy_precondition: boolean; // not blocked or illegal
  failure_reasons: string[];
}

export interface DecisionExplanation {
  why: string[];
  risks: string[];
  next_action: string;
}

export interface ValidationResult {
  validation_score: number; // 0–100
  priority_score: number; // 0–100
  decision: OpportunityDecision;
  validation_status: ValidationStatus;
  confidence: number;
  categories: CategoryValidationScore[];
  customer_profile: CustomerProfile;
  competitors: CompetitorItem[];
  proposed_solution: ProposedSolution;
  experiment_proposal: ExperimentProposal;
  wtp: WtpClassification;
  preconditions: PreconditionsCheck;
  explanation: DecisionExplanation;
}
