import { strategyRepo } from "@/database/repositories/strategy-repo";
import type {
  ObservationWindow,
  StrategyRecommendation,
  StrategyAction,
} from "@/types/strategy";

export interface WaitEvaluationResult {
  should_wait: boolean;
  wait_reason: string;
  target_metrics: string[];
  expected_review_date: string | null;
  active_window: ObservationWindow | null;
  safe_background_actions: string[];
  reassessment_triggers: string[];
}

export class WaitStrategyEvaluator {
  /**
   * Determine if waiting for data is the optimal primary business strategy
   */
  async evaluateWaitStrategy(
    productId: string,
    isDemo: boolean = false
  ): Promise<WaitEvaluationResult> {
    const windows = await strategyRepo.listObservationWindows(productId, isDemo);
    const activeWindow = windows.find(
      (w: ObservationWindow) => w.window_status === "IN_PROGRESS" || w.window_status === "TIMING_UNKNOWN"
    );

    if (!activeWindow) {
      return {
        should_wait: false,
        wait_reason: "No active observation window requires waiting. Evidence is ready for evaluation.",
        target_metrics: [],
        expected_review_date: null,
        active_window: null,
        safe_background_actions: [],
        reassessment_triggers: ["New telemetry event recorded"],
      };
    }

    const currentCollected = activeWindow.actual_sample_size_collected;
    const minRequired = activeWindow.min_sample_size_required;
    const needed = Math.max(0, minRequired - currentCollected);

    return {
      should_wait: true,
      wait_reason: `Active observation window in progress. Need ${needed} more samples (collected ${currentCollected}/${minRequired}) to prevent premature false conclusions.`,
      target_metrics: [
        `Sample size >= ${minRequired}`,
        `Minimum exposure time reached (${activeWindow.target_review_date || "7 days"})`,
      ],
      expected_review_date: activeWindow.target_review_date,
      active_window: activeWindow,
      safe_background_actions: [
        "Continue scheduled organic distribution posts",
        "Monitor health check telemetry and server status",
        "Collect inbound customer interaction signals",
      ],
      reassessment_triggers: [
        `Collected samples reaches ${minRequired}`,
        "Calendar date reaches review date",
        "Critical error or anomaly spike detected",
      ],
    };
  }

  /**
   * Construct a complete first-class WAIT_FOR_DATA StrategyRecommendation
   */
  buildWaitRecommendation(
    productId: string,
    waitEval: WaitEvaluationResult,
    isDemo: boolean = false
  ): Omit<StrategyRecommendation, "id" | "created_at" | "updated_at"> {
    return {
      objective: "ACCUMULATE_STATISTICAL_EVIDENCE",
      problem_addressed: "Insufficient sample size to make reliable strategic pivot or scaling decisions",
      proposed_action: "Maintain active observation window and collect organic exposure data without interrupting funnel baseline",
      strategy_type: "WAIT_FOR_DATA",
      horizon: "CURRENT_EXPERIMENT",
      evidence_provenance: "OBSERVED",
      evidence_summary: {
        active_window_id: waitEval.active_window?.id,
        current_samples: waitEval.active_window?.actual_sample_size_collected ?? 0,
        required_samples: waitEval.active_window?.min_sample_size_required ?? 30,
        target_review_date: waitEval.expected_review_date,
      },
      confidence: "HIGH",
      expected_outcome: `Reach statistically reliable threshold of ${waitEval.active_window?.min_sample_size_required ?? 30} data points to decide next phase with integrity.`,
      assumptions: [
        "Current distribution channels continue running without manual intervention",
        "Conversion baseline remains stable during observation period",
      ],
      resource_requirements: {
        spend_inr: 0,
        human_hours: 0,
        compute: "LIGHTWEIGHT_TELEMETRY_RECORDING",
      },
      risks: [
        "Delaying pivot if offer has fatal flaw",
        "Opportunity cost of waiting for traffic to accrue",
      ],
      reversibility: "HIGH",
      observation_requirements: {
        review_date: waitEval.expected_review_date,
        triggers: waitEval.reassessment_triggers,
      },
      success_criteria: `Attain ${waitEval.active_window?.min_sample_size_required ?? 30} observations or reach ${waitEval.expected_review_date}`,
      failure_criteria: "Traffic ceases entirely for 5 consecutive days",
      rank_order: 1,
      is_primary: true,
      status: "ACTIVE",
      is_demo: isDemo,
    };
  }
}

export const waitStrategyEvaluator = new WaitStrategyEvaluator();
