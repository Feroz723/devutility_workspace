/**
 * Decision Engine — Scoring Module
 * =================================
 * SINGLE SOURCE OF TRUTH for opportunity scoring.
 * Do NOT duplicate this formula anywhere else in the codebase.
 */

import { z } from "zod";

// ===== Input Schema =====

const Score = z.number().int().min(0).max(100);

export const ScoringInputSchema = z.object({
  demand_score: Score,
  competition_score: Score,
  monetization_score: Score,
  automation_score: Score,
  zero_cost_score: Score,
});
export type ScoringInput = z.infer<typeof ScoringInputSchema>;

// ===== Weights =====

export const SCORING_WEIGHTS = {
  demand: 0.25,
  competition: 0.15, // inverse scored
  monetization: 0.25,
  automation: 0.15,
  zero_cost: 0.20,
} as const;

// ===== Decision Thresholds =====

export const DECISION_THRESHOLDS = {
  TEST: 80,
  RESEARCH_MORE: 60,
  // Below 60 → REJECT
} as const;

export type Decision = "TEST" | "RESEARCH_MORE" | "REJECT";

// ===== Scoring Factor =====

export interface ScoringFactor {
  factor_name: string;
  raw_score: number;
  weight: number;
  weighted_score: number;
  notes: string;
}

// ===== Score Result =====

export interface ScoreResult {
  overall_score: number;
  decision: Decision;
  factors: ScoringFactor[];
  requires_spend_review: boolean;
}

/**
 * Calculate the overall opportunity score.
 *
 * Formula:
 *   overall = (demand * 0.25) + ((100 - competition) * 0.15) + (monetization * 0.25) + (automation * 0.15) + (zero_cost * 0.20)
 *
 * Competition is INVERSE scored: a high competition_score means the market is crowded,
 * so the contribution is (100 - competition_score).
 *
 * Returns a rounded integer 0–100.
 */
export function calculateOverallScore(input: ScoringInput): number {
  const score =
    input.demand_score * SCORING_WEIGHTS.demand +
    (100 - input.competition_score) * SCORING_WEIGHTS.competition +
    input.monetization_score * SCORING_WEIGHTS.monetization +
    input.automation_score * SCORING_WEIGHTS.automation +
    input.zero_cost_score * SCORING_WEIGHTS.zero_cost;

  return Math.round(score);
}

/**
 * Determine the decision based on score thresholds.
 *
 * 80–100 → TEST
 * 60–79  → RESEARCH_MORE
 * 0–59   → REJECT
 */
export function determineDecision(score: number): Decision {
  if (score >= DECISION_THRESHOLDS.TEST) return "TEST";
  if (score >= DECISION_THRESHOLDS.RESEARCH_MORE) return "RESEARCH_MORE";
  return "REJECT";
}

/**
 * Calculate all scoring factors for audit/display.
 */
export function calculateFactors(input: ScoringInput): ScoringFactor[] {
  return [
    {
      factor_name: "demand",
      raw_score: input.demand_score,
      weight: SCORING_WEIGHTS.demand,
      weighted_score: Math.round(input.demand_score * SCORING_WEIGHTS.demand * 100) / 100,
      notes: `Demand signal strength: ${input.demand_score}/100`,
    },
    {
      factor_name: "competition",
      raw_score: input.competition_score,
      weight: SCORING_WEIGHTS.competition,
      weighted_score:
        Math.round((100 - input.competition_score) * SCORING_WEIGHTS.competition * 100) / 100,
      notes: `Competition (inverse): raw=${input.competition_score}, effective=${100 - input.competition_score}`,
    },
    {
      factor_name: "monetization",
      raw_score: input.monetization_score,
      weight: SCORING_WEIGHTS.monetization,
      weighted_score:
        Math.round(input.monetization_score * SCORING_WEIGHTS.monetization * 100) / 100,
      notes: `Monetization potential: ${input.monetization_score}/100`,
    },
    {
      factor_name: "automation",
      raw_score: input.automation_score,
      weight: SCORING_WEIGHTS.automation,
      weighted_score:
        Math.round(input.automation_score * SCORING_WEIGHTS.automation * 100) / 100,
      notes: `Automation feasibility: ${input.automation_score}/100`,
    },
    {
      factor_name: "zero_cost",
      raw_score: input.zero_cost_score,
      weight: SCORING_WEIGHTS.zero_cost,
      weighted_score:
        Math.round(input.zero_cost_score * SCORING_WEIGHTS.zero_cost * 100) / 100,
      notes: `Zero-cost feasibility: ${input.zero_cost_score}/100`,
    },
  ];
}

/**
 * Run the full scoring pipeline.
 *
 * IMPORTANT: A high score CANNOT override the zero-spend guard.
 * If zero_cost_score is below 50, the opportunity requires spend review
 * even if the overall score qualifies for TEST.
 */
export function scoreOpportunity(input: ScoringInput): ScoreResult {
  const parsed = ScoringInputSchema.parse(input);
  const overall_score = calculateOverallScore(parsed);
  let decision = determineDecision(overall_score);
  const factors = calculateFactors(parsed);

  // Zero-spend guard: if testing requires spending money, cannot auto-TEST
  const requires_spend_review = parsed.zero_cost_score < 50;
  if (requires_spend_review && decision === "TEST") {
    decision = "RESEARCH_MORE";
  }

  return {
    overall_score,
    decision,
    factors,
    requires_spend_review,
  };
}
