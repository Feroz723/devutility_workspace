import { CategoryValidationScore } from "./types";

export interface CategoryScoreInput {
  problem_severity: number;
  demand_evidence: number;
  evidence_strength: number;
  willingness_to_pay: number;
  customer_clarity: number;
  mvp_feasibility: number;
  distribution_feasibility: number;
  zero_cost_feasibility: number;
}

export const VALIDATION_WEIGHTS = {
  problem_severity: 0.15,
  demand_evidence: 0.20,
  evidence_strength: 0.15,
  willingness_to_pay: 0.15,
  customer_clarity: 0.10,
  mvp_feasibility: 0.10,
  distribution_feasibility: 0.05,
  zero_cost_feasibility: 0.10,
} as const;

export function calculateValidationScore(input: CategoryScoreInput): {
  total_score: number;
  categories: CategoryValidationScore[];
} {
  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

  const categories: CategoryValidationScore[] = [
    {
      category: "Problem Severity",
      weight: VALIDATION_WEIGHTS.problem_severity,
      score: clamp(input.problem_severity),
      weighted_score: clamp(input.problem_severity) * VALIDATION_WEIGHTS.problem_severity,
      rationale: getSeverityRationale(input.problem_severity),
    },
    {
      category: "Demand Evidence",
      weight: VALIDATION_WEIGHTS.demand_evidence,
      score: clamp(input.demand_evidence),
      weighted_score: clamp(input.demand_evidence) * VALIDATION_WEIGHTS.demand_evidence,
      rationale: getDemandRationale(input.demand_evidence),
    },
    {
      category: "Evidence Strength",
      weight: VALIDATION_WEIGHTS.evidence_strength,
      score: clamp(input.evidence_strength),
      weighted_score: clamp(input.evidence_strength) * VALIDATION_WEIGHTS.evidence_strength,
      rationale: getEvidenceRationale(input.evidence_strength),
    },
    {
      category: "Willingness to Pay",
      weight: VALIDATION_WEIGHTS.willingness_to_pay,
      score: clamp(input.willingness_to_pay),
      weighted_score: clamp(input.willingness_to_pay) * VALIDATION_WEIGHTS.willingness_to_pay,
      rationale: getWtpRationale(input.willingness_to_pay),
    },
    {
      category: "Customer Clarity",
      weight: VALIDATION_WEIGHTS.customer_clarity,
      score: clamp(input.customer_clarity),
      weighted_score: clamp(input.customer_clarity) * VALIDATION_WEIGHTS.customer_clarity,
      rationale: getCustomerRationale(input.customer_clarity),
    },
    {
      category: "MVP Feasibility",
      weight: VALIDATION_WEIGHTS.mvp_feasibility,
      score: clamp(input.mvp_feasibility),
      weighted_score: clamp(input.mvp_feasibility) * VALIDATION_WEIGHTS.mvp_feasibility,
      rationale: getMvpRationale(input.mvp_feasibility),
    },
    {
      category: "Distribution Feasibility",
      weight: VALIDATION_WEIGHTS.distribution_feasibility,
      score: clamp(input.distribution_feasibility),
      weighted_score: clamp(input.distribution_feasibility) * VALIDATION_WEIGHTS.distribution_feasibility,
      rationale: getDistributionRationale(input.distribution_feasibility),
    },
    {
      category: "Zero-Cost Feasibility",
      weight: VALIDATION_WEIGHTS.zero_cost_feasibility,
      score: clamp(input.zero_cost_feasibility),
      weighted_score: clamp(input.zero_cost_feasibility) * VALIDATION_WEIGHTS.zero_cost_feasibility,
      rationale: getZeroCostRationale(input.zero_cost_feasibility),
    },
  ];

  const rawSum = categories.reduce((sum, cat) => sum + cat.weighted_score, 0);
  const total_score = clamp(rawSum);

  return { total_score, categories };
}

function getSeverityRationale(score: number): string {
  if (score >= 80) return "High urgency; problem causes direct revenue loss, downtime, or compliance blockers.";
  if (score >= 50) return "Moderate pain; users experience friction or recurring workflow delays.";
  return "Low annoyance or discretionary nice-to-have problem.";
}

function getDemandRationale(score: number): string {
  if (score >= 80) return "Multiple explicit requests, search traffic, or active community discussions seeking solutions.";
  if (score >= 50) return "Isolated user queries or sporadic complaints without persistent demand signals.";
  return "Very thin demand indicators; few or no spontaneous requests found.";
}

function getEvidenceRationale(score: number): string {
  if (score >= 80) return "Triangulated across multiple independent domains with verifiable live URLs.";
  if (score >= 50) return "Supported by single-source evidence or limited external links.";
  return "Anecdotal or inferred with low verification confidence.";
}

function getWtpRationale(score: number): string {
  if (score >= 80) return "Strong commercial intent: users currently paying alternatives, requesting invoices, or pricing quotes.";
  if (score >= 50) return "Moderate commercial intent: users express willingness to pay if specific pain is solved.";
  return "Weak or non-existent monetization signals; user base expects free or open-source solutions.";
}

function getCustomerRationale(score: number): string {
  if (score >= 80) return "Sharply defined target persona, specific role/title, daily workflow, and trigger events.";
  if (score >= 50) return "Broad customer segment identified with partial workflow context.";
  return "Vague or generalized audience ('everyone', 'developers', 'businesses').";
}

function getMvpRationale(score: number): string {
  if (score >= 80) return "Can be built as a self-contained digital tool or automation script within 2–5 days.";
  if (score >= 50) return "Requires 1–2 weeks of engineering or third-party integrations.";
  return "Heavy infrastructure, enterprise compliance, or hardware dependencies requiring months.";
}

function getDistributionRationale(score: number): string {
  if (score >= 80) return "High concentration in identifiable free public forums, subreddits, or directories.";
  if (score >= 50) return "Moderate reachability; requires direct outbound outreach or niche discovery.";
  return "Opaque distribution channel requiring paid ads or enterprise procurement cycles.";
}

function getZeroCostRationale(score: number): string {
  if (score >= 80) return "Validation test executable at ₹0 cost using existing platforms, organic outreach, and static landing pages.";
  if (score >= 50) return "Minimal potential cost (< ₹500) for edge cases or domain registration.";
  return "Requires paid ad spend, software licenses, or upfront cash to validate.";
}
