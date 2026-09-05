import { OpportunityDecision, ValidationStatus } from "@/types/opportunity";
import { PreconditionsCheck, DecisionExplanation } from "@/validation/types";
import { classifyAction } from "./zero-spend-guard";

export interface EvaluationInput {
  overall_score: number;
  research_confidence: number;
  validation_score: number;
  source_count: number;
  direct_evidence_count: number;
  zero_cost_score: number;
  estimated_cost_inr?: number;
  risk_level?: string | null;
  action_type?: string;
  description?: string;
}

export interface EvaluationResult {
  decision: OpportunityDecision;
  validation_status: ValidationStatus;
  preconditions: PreconditionsCheck;
  explanation: DecisionExplanation;
}

/**
 * Deterministic Decision Evaluator
 * =================================
 * Evaluates the 7 mandatory preconditions for an opportunity to advance
 * to TEST_CANDIDATE.
 *
 * Preconditions:
 * 1. overall_score >= 80
 * 2. research_confidence >= 60%
 * 3. validation_score >= 70%
 * 4. source_count >= 2
 * 5. direct_evidence_count >= 1
 * 6. zero_cost_score >= 50 AND estimated_cost_inr === 0
 * 7. spend_guard must pass (not BLOCKED)
 */
export function evaluateCandidate(input: EvaluationInput): EvaluationResult {
  const failureReasons: string[] = [];
  const whyReasons: string[] = [];
  const risks: string[] = [];

  // Check spend guard
  const spendCheck = classifyAction({
    action_type: input.action_type || "validate_opportunity",
    description: input.description || "Testing candidate feasibility",
    estimated_cost_inr: input.estimated_cost_inr ?? 0,
    is_reversible: true,
    is_sensitive: false,
  });

  const isBlocked = spendCheck.classification === "BLOCKED";
  const requiresSpendApproval = spendCheck.classification === "REQUIRES_APPROVAL";

  // Preconditions evaluations
  const scorePass = input.overall_score >= 80;
  const confidencePass = input.research_confidence >= 60;
  const validationPass = input.validation_score >= 70;
  const sourceCountPass = input.source_count >= 2;
  const evidencePass = input.direct_evidence_count >= 1;
  const zeroCostPass = input.zero_cost_score >= 50 && (input.estimated_cost_inr ?? 0) === 0;
  const spendPolicyPass = !isBlocked;

  if (!scorePass) {
    failureReasons.push(`Overall opportunity score (${input.overall_score}) is below the required 80 threshold.`);
  } else {
    whyReasons.push(`Strong overall score (${input.overall_score}/100) satisfies viability threshold.`);
  }

  if (!confidencePass) {
    failureReasons.push(`Research confidence (${input.research_confidence}%) is below the required 60% threshold.`);
  } else {
    whyReasons.push(`Research confidence (${input.research_confidence}%) indicates trustworthy data.`);
  }

  if (!validationPass) {
    failureReasons.push(`Validation score (${input.validation_score}%) is below the required 70% threshold.`);
  } else {
    whyReasons.push(`Validation score (${input.validation_score}/100) demonstrates strong market viability.`);
  }

  if (!sourceCountPass) {
    failureReasons.push(`Requires at least 2 independent research sources (found ${input.source_count}).`);
  } else {
    whyReasons.push(`Corroborated across ${input.source_count} independent research sources.`);
  }

  if (!evidencePass) {
    failureReasons.push(`Requires at least 1 direct quote/evidence snippet (found ${input.direct_evidence_count}).`);
  } else {
    whyReasons.push(`Backed by ${input.direct_evidence_count} direct verbatim evidence quotes.`);
  }

  if (!zeroCostPass) {
    failureReasons.push(
      input.zero_cost_score < 50
        ? `Zero-cost feasibility score (${input.zero_cost_score}) is below 50.`
        : `Estimated cost (₹${input.estimated_cost_inr}) exceeds ₹0 zero-spend policy.`
    );
  } else {
    whyReasons.push("Verified 100% executable under ₹0 budget constraint.");
  }

  if (isBlocked) {
    failureReasons.push(`Safety policy violation: ${spendCheck.reason}`);
  }

  // Assess risks
  if (input.risk_level && input.risk_level.toLowerCase() !== "low") {
    risks.push(`Operational risk level rated as "${input.risk_level}".`);
  }
  if (input.source_count === 2) {
    risks.push("Source diversity is minimal (exactly 2 sources). Additional corroboration recommended.");
  }
  if (input.zero_cost_score < 70 && input.zero_cost_score >= 50) {
    risks.push("Zero-cost feasibility is moderate (50–69); monitor for hidden resource requirements.");
  }

  const allPreconditionsMet =
    scorePass &&
    confidencePass &&
    validationPass &&
    sourceCountPass &&
    evidencePass &&
    zeroCostPass &&
    spendPolicyPass &&
    !requiresSpendApproval;

  let decision: OpportunityDecision = "REJECT";
  let validationStatus: ValidationStatus = "REJECTED";
  let nextAction = "Reject opportunity due to insufficient commercial viability or low scores.";

  if (isBlocked) {
    decision = "BLOCKED";
    validationStatus = "REJECTED";
    nextAction = "Permanently blocked due to policy or safety constraints.";
  } else if (requiresSpendApproval) {
    decision = "REQUIRES_APPROVAL";
    validationStatus = "REQUIRES_APPROVAL";
    nextAction = "Submit to human operator for financial spend or sensitive action review.";
  } else if (allPreconditionsMet) {
    decision = "TEST_CANDIDATE";
    validationStatus = "TEST_CANDIDATE";
    nextAction = "Eligible for autonomous zero-cost experiment execution.";
  } else if (!sourceCountPass || !evidencePass || !confidencePass) {
    // Insufficient evidence cases trigger RESEARCH_MORE
    decision = "RESEARCH_MORE";
    validationStatus = "RESEARCHING";
    nextAction = "Queue secondary research run to gather more independent sources and direct quotes.";
  } else {
    decision = "REJECT";
    validationStatus = "REJECTED";
    nextAction = "Opportunity rejected. Does not meet validation thresholds.";
  }

  const preconditions: PreconditionsCheck = {
    is_candidate: allPreconditionsMet,
    score_precondition: scorePass,
    confidence_precondition: confidencePass,
    validation_precondition: validationPass,
    source_count_precondition: sourceCountPass,
    direct_evidence_precondition: evidencePass,
    zero_cost_precondition: zeroCostPass,
    spend_policy_precondition: spendPolicyPass,
    failure_reasons: failureReasons,
  };

  const explanation: DecisionExplanation = {
    why: whyReasons,
    risks: risks.length > 0 ? risks : ["No major operational risks identified."],
    next_action: nextAction,
  };

  return {
    decision,
    validation_status: validationStatus,
    preconditions,
    explanation,
  };
}
