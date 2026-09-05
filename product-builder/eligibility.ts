import type { Experiment, ExperimentMetric } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";
import type { ProductBuildEligibilityResult } from "./types";
import { verifyZeroCostBuild } from "./guard";

export interface EligibilityEvaluationOptions {
  minResearchConfidence?: number; // default 60
  minValidationScore?: number; // default 70
  minZeroCostFeasibility?: number; // default 50
  allowedResults?: string[]; // default ["WINNER", "PROMISING", "WIN"]
  metrics?: ExperimentMetric[];
}

/**
 * Checks whether an experiment and its linked opportunity qualify for autonomous product building.
 */
export function checkProductBuildEligibility(
  experiment: Experiment,
  opportunity?: Opportunity | null,
  options?: EligibilityEvaluationOptions
): ProductBuildEligibilityResult {
  const minConfidence = options?.minResearchConfidence ?? 60;
  const minValidation = options?.minValidationScore ?? 70;
  const minFeasibility = options?.minZeroCostFeasibility ?? 50;
  const allowedResults = options?.allowedResults ?? ["WINNER", "PROMISING", "WIN"];

  const reasons: string[] = [];
  const blockers: string[] = [];

  // Normalize scores (if represented as 0.0-1.0 or 0-100)
  const oppConfidenceRaw = opportunity
    ? ((opportunity as any).confidence_score ?? (opportunity as any).research_confidence ?? 0)
    : 0;
  const oppConfidence = oppConfidenceRaw <= 1.0 && oppConfidenceRaw > 0 ? oppConfidenceRaw * 100 : oppConfidenceRaw;

  const oppValidationRaw = opportunity
    ? (opportunity.validation_score !== null && opportunity.validation_score !== undefined
        ? opportunity.validation_score
        : 75)
    : 0;
  const oppValidation = oppValidationRaw <= 1.0 && oppValidationRaw > 0 ? oppValidationRaw * 100 : oppValidationRaw;

  const oppFeasibilityRaw = opportunity
    ? ((opportunity as any).feasibility_score ?? (opportunity as any).zero_cost_score ?? 80)
    : 0;
  const oppFeasibility = oppFeasibilityRaw <= 1.0 && oppFeasibilityRaw > 0 ? oppFeasibilityRaw * 100 : oppFeasibilityRaw;


  // 1. Experiment Status & Result Check
  const expResult = (experiment.result || "").toUpperCase();
  const isWinnerOrPromising = allowedResults.includes(expResult);

  if (isWinnerOrPromising) {
    reasons.push(`Experiment evaluated with positive outcome: ${expResult}.`);
  } else {
    blockers.push(`Experiment result is '${expResult || "PENDING"}'. Must be WINNER or PROMISING.`);
  }

  const stoppedStatuses = ["FAILED", "CANCELLED", "STOPPED"];
  if (stoppedStatuses.includes((experiment.status || "").toUpperCase())) {
    blockers.push(`Experiment is currently ${experiment.status}. Cannot build product from failed/stopped experiment.`);
  }

  // 2. Real Metrics Check
  const metricsList = options?.metrics || [];
  const metricsCount = metricsList.length;

  let totalVisitorsOrInteractions = 0;
  let totalConversionsOrFeedback = 0;

  for (const m of metricsList) {
    const name = m.metric_name.toLowerCase();
    const val = Number(m.metric_value) || 0;
    if (name.includes("visitor") || name.includes("view") || name.includes("traffic") || name.includes("click") || name.includes("impression")) {
      totalVisitorsOrInteractions += val;
    }
    if (name.includes("conversion") || name.includes("signup") || name.includes("lead") || name.includes("order") || name.includes("response")) {
      totalConversionsOrFeedback += val;
    }
  }

  // If metrics list is provided, verify real interaction
  const hasRealUsers = metricsCount > 0 ? (totalVisitorsOrInteractions > 0 || totalConversionsOrFeedback > 0) : true;
  if (metricsCount > 0 && !hasRealUsers) {
    blockers.push("Experiment metrics indicate 0 real user traffic or interactions.");
  } else if (metricsCount > 0) {
    reasons.push(`Verified real user signals: ${totalVisitorsOrInteractions} visitors/clicks, ${totalConversionsOrFeedback} conversions/actions.`);
  }

  // 3. Opportunity Validity Check
  if (!opportunity) {
    blockers.push("Linked opportunity is missing or deleted.");
  } else {
    const oppStatus = (opportunity.status || "").toUpperCase();
    if (["REJECTED", "KILLED", "ARCHIVED"].includes(oppStatus)) {
      blockers.push(`Linked opportunity has status ${oppStatus}. Must be an active, validated opportunity.`);
    } else {
      reasons.push(`Linked opportunity '${opportunity.title}' is active.`);
    }

    // 4. Research Confidence Check
    if (oppConfidence < minConfidence) {
      blockers.push(`Research confidence (${oppConfidence.toFixed(0)}%) is below required threshold (${minConfidence}%).`);
    } else {
      reasons.push(`Research confidence meets threshold: ${oppConfidence.toFixed(0)}% >= ${minConfidence}%.`);
    }

    // 5. Validation Score Check
    if (oppValidation < minValidation) {
      blockers.push(`Validation score (${oppValidation.toFixed(0)}) is below required threshold (${minValidation}).`);
    } else {
      reasons.push(`Validation score meets threshold: ${oppValidation.toFixed(0)} >= ${minValidation}.`);
    }

    // 6. Feasibility Score Check
    if (oppFeasibility < minFeasibility) {
      blockers.push(`Zero-cost feasibility score (${oppFeasibility.toFixed(0)}) is below threshold (${minFeasibility}).`);
    } else {
      reasons.push(`Feasibility meets threshold: ${oppFeasibility.toFixed(0)} >= ${minFeasibility}.`);
    }
  }

  // 7. Cost Check
  const estimatedCost = Number((experiment as any).cost_inr ?? experiment.estimated_cost_inr) || 0;
  if (estimatedCost > 0) {
    blockers.push(`Experiment incurs non-zero cost (₹${estimatedCost}). Autonomous build requires ₹0 budget.`);
  } else {
    reasons.push("Zero-cost build requirement satisfied: ₹0 budget.");
  }

  // 8. Zero-Cost Guard Check
  const guard = verifyZeroCostBuild(null, null);
  if (!guard.compliant) {
    blockers.push(...guard.flaggedItems);
  }

  const eligible = blockers.length === 0;

  return {
    eligible,
    reasons,
    blockers,
    metrics: {
      experiment_status: experiment.status,
      experiment_result: experiment.result ?? null,
      research_confidence: oppConfidence,
      validation_score: oppValidation,
      zero_cost_feasibility: oppFeasibility,
      estimated_cost_inr: estimatedCost,
      metrics_count: metricsCount,
      has_real_users: hasRealUsers,
    },
  };

}
