import { queryMany } from "@/database/client";
import type { PortfolioDecisionType, IntelligenceConfidence } from "./types";

export interface ExperimentEvaluation {
  experiment_id: string;
  name: string;
  status: string;
  decision: PortfolioDecisionType;
  confidence: IntelligenceConfidence;
  reasons: string[];
  recommended_next_experiment?: string;
  is_actionable: boolean;
}

export class ExperimentDecisionEngine {
  /**
   * Evaluate active and recently concluded experiments
   */
  async evaluateExperiments(isDemo: boolean = false): Promise<ExperimentEvaluation[]> {
    const experiments = await queryMany<any>(
      `SELECT 
         e.id, e.name, e.status, e.hypothesis, e.target_metric,
         e.sample_size, e.confidence_score, e.conclusion,
         e.created_at
       FROM experiments e
       WHERE e.is_demo = $1
       ORDER BY e.created_at DESC`,
      [isDemo]
    );

    const evaluations: ExperimentEvaluation[] = [];

    for (const exp of experiments) {
      const sampleSize = Number(exp.sample_size) || 0;
      const confidenceScore = Number(exp.confidence_score) || 0;
      const reasons: string[] = [];
      let decision: PortfolioDecisionType = "CONTINUE";
      let confidence: IntelligenceConfidence = "LOW";
      let nextExp: string | undefined;

      if (sampleSize < 10) {
        decision = "CONTINUE";
        confidence = "INSUFFICIENT_DATA";
        reasons.push(`Sample size (${sampleSize}) is too small to reach statistical significance.`);
      } else if (exp.status === "COMPLETED") {
        if (confidenceScore >= 80) {
          decision = "SCALE";
          confidence = "HIGH";
          reasons.push(`Experiment hypothesis validated with high confidence score (${confidenceScore}%).`);
          nextExp = `Incorporate validated findings from '${exp.name}' directly into core product UX.`;
        } else {
          decision = "ITERATE";
          confidence = "MEDIUM";
          reasons.push(`Experiment reached sample target, but outcome showed mixed signals (confidence: ${confidenceScore}%).`);
          nextExp = `Follow-up variant testing narrower cohort or simplified copy.`;
        }
      } else if (exp.status === "FAILED") {
        decision = "ARCHIVE";
        confidence = "HIGH";
        reasons.push("Experiment conclusively failed to validate the core hypothesis.");
        reasons.push(exp.conclusion || "Hypothesis rejected by market interaction.");
      } else {
        decision = "CONTINUE";
        confidence = sampleSize >= 20 ? "MEDIUM" : "LOW";
        reasons.push("Experiment is currently active; continuing observation.");
      }

      evaluations.push({
        experiment_id: exp.id,
        name: exp.name,
        status: exp.status || "RUNNING",
        decision,
        confidence,
        reasons,
        recommended_next_experiment: nextExp,
        is_actionable: decision !== "CONTINUE",
      });
    }

    return evaluations;
  }
}

export const experimentDecisionEngine = new ExperimentDecisionEngine();
