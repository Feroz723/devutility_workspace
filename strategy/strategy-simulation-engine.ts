import type {
  StrategyRecommendation,
  StrategyType,
  StrategicHorizon,
  StrategyConfidence,
  EvidenceProvenance,
} from "@/types/strategy";

export interface StrategyOption {
  objective: string;
  problem_addressed: string;
  proposed_action: string;
  strategy_type: StrategyType;
  horizon: StrategicHorizon;
  evidence_provenance: EvidenceProvenance;
  evidence_summary: Record<string, any>;
  confidence: StrategyConfidence;
  expected_outcome: string;
  assumptions: string[];
  resource_requirements: Record<string, any>;
  risks: string[];
  reversibility: "HIGH" | "MEDIUM" | "LOW";
  observation_requirements: Record<string, any>;
  success_criteria: string;
  failure_criteria: string;
}

export class StrategySimulationEngine {
  /**
   * Score and rank candidate strategy options
   */
  rankStrategies(
    options: StrategyOption[],
    primaryObjective: string
  ): Array<StrategyOption & { score: number; rank_order: number }> {
    const scored = options.map((opt) => {
      let score = 50;

      // 1. Reversibility score
      if (opt.reversibility === "HIGH") score += 20;
      else if (opt.reversibility === "MEDIUM") score += 10;
      else score -= 10;

      // 2. Zero-cost discipline: reward ₹0 spend
      const spend = Number(opt.resource_requirements?.spend_inr ?? 0);
      if (spend === 0) score += 20;
      else score -= 50; // heavily penalize any paid spend

      // 3. Confidence score
      if (opt.confidence === "VERY_HIGH") score += 15;
      else if (opt.confidence === "HIGH") score += 10;
      else if (opt.confidence === "MEDIUM") score += 5;
      else if (opt.confidence === "LOW") score += 0;
      else score -= 10;

      // 4. Alignment with primary objective
      if (opt.objective.includes(primaryObjective) || primaryObjective.includes(opt.objective)) {
        score += 15;
      }

      // 5. Evidence provenance
      if (opt.evidence_provenance === "OBSERVED") score += 15;
      else if (opt.evidence_provenance === "CALCULATED") score += 10;
      else if (opt.evidence_provenance === "EXTERNAL_EVIDENCE") score += 5;

      return {
        ...opt,
        score,
        rank_order: 0,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Assign rank orders (1-based)
    return scored.map((item, idx) => ({
      ...item,
      rank_order: idx + 1,
    }));
  }
}

export const strategySimulationEngine = new StrategySimulationEngine();
