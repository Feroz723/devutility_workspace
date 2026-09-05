export {
  calculateOverallScore,
  determineDecision,
  calculateFactors,
  scoreOpportunity,
  ScoringInputSchema,
  SCORING_WEIGHTS,
  DECISION_THRESHOLDS,
} from "./scoring";
export type { ScoringInput, Decision, ScoringFactor, ScoreResult } from "./scoring";

export { classifyAction } from "./zero-spend-guard";
export type {
  SpendClassification,
  SpendGuardInput,
  SpendGuardResult,
} from "./zero-spend-guard";
