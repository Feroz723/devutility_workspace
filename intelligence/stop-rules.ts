import type { ProductPerformance, ChannelPerformance, PortfolioDecisionType } from "@/types/intelligence";

export interface StopRuleEvaluation {
  isStopCandidate: boolean;
  recommendedAction: PortfolioDecisionType;
  triggeredSignals: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
  rationale: string;
  requiresHumanApproval: boolean;
}

export class StopRulesEvaluator {
  /**
   * Evaluate a product against multi-signal stop conditions
   */
  evaluateProductStopRules(perf: ProductPerformance): StopRuleEvaluation {
    const signals: string[] = [];

    // Condition 1: High visitors with zero sales
    if (perf.traffic_count >= 100 && perf.customers_count === 0) {
      signals.push("ZERO_SALES_HIGH_TRAFFIC: Over 100 visitors converted to 0 paying customers.");
    }

    // Condition 2: Abnormally high refund rate with minimal customer base
    if (perf.customers_count >= 5 && perf.refund_rate_percent >= 25) {
      signals.push(`HIGH_REFUND_RATE: Refund rate is ${perf.refund_rate_percent.toFixed(1)}% (threshold: 25%).`);
    }

    // Condition 3: Excessive confirmed churn
    if (perf.customers_count >= 5 && perf.churn_rate_percent >= 60) {
      signals.push(`CRITICAL_CHURN: Churn rate is ${perf.churn_rate_percent.toFixed(1)}% (threshold: 60%).`);
    }

    // Condition 4: High support burden with low outcome score
    if (perf.support_burden_score >= 80 && perf.customer_outcomes_score <= 30) {
      signals.push(`UNSUSTAINABLE_SUPPORT: Support burden is ${perf.support_burden_score}/100 while outcome score is only ${perf.customer_outcomes_score}/100.`);
    }

    // Multi-signal rule: Must have at least 2 distinct stop signals to become a STOP_CANDIDATE
    if (signals.length >= 2) {
      return {
        isStopCandidate: true,
        recommendedAction: "STOP",
        triggeredSignals: signals,
        severity: "HIGH",
        rationale: `Product meets multiple stop criteria (${signals.length} signals triggered). Flagged as STOP_CANDIDATE for operator review.`,
        requiresHumanApproval: true,
      };
    }

    if (signals.length === 1) {
      return {
        isStopCandidate: false,
        recommendedAction: "ITERATE",
        triggeredSignals: signals,
        severity: "MEDIUM",
        rationale: `Product triggered single risk signal (${signals[0]}). Recommend targeted iteration before escalating to stop candidate.`,
        requiresHumanApproval: false,
      };
    }

    return {
      isStopCandidate: false,
      recommendedAction: "CONTINUE",
      triggeredSignals: [],
      severity: "LOW",
      rationale: "Product health within operational boundaries.",
      requiresHumanApproval: false,
    };
  }

  /**
   * Evaluate a distribution channel against stop conditions
   */
  evaluateChannelStopRules(perf: ChannelPerformance): StopRuleEvaluation {
    const signals: string[] = [];

    if (perf.traffic_count >= 150 && perf.qualified_leads_count === 0) {
      signals.push("ZERO_LEADS_HIGH_TRAFFIC: Over 150 visits with zero qualified leads generated.");
    }

    if (perf.effort_score >= 8 && perf.qualified_leads_count === 0) {
      signals.push("DISPROPORTIONATE_EFFORT: Maximum distribution effort expended with zero leads.");
    }

    if (perf.cost_inr > 0 && perf.revenue_inr === 0 && perf.traffic_count >= 50) {
      signals.push(`PAID_DRAIN: Spent ₹${perf.cost_inr} with ₹0 revenue generated.`);
    }

    if (signals.length >= 2 || (perf.cost_inr > 0 && perf.revenue_inr === 0)) {
      return {
        isStopCandidate: true,
        recommendedAction: "STOP",
        triggeredSignals: signals,
        severity: "HIGH",
        rationale: `Channel underperforming across multiple dimensions (${signals.join("; ")}). Recommend stopping distribution effort.`,
        requiresHumanApproval: true,
      };
    }

    if (signals.length === 1) {
      return {
        isStopCandidate: false,
        recommendedAction: "PAUSE",
        triggeredSignals: signals,
        severity: "MEDIUM",
        rationale: `Channel flagged with caution: ${signals[0]}. Temporarily pause to re-evaluate audience match.`,
        requiresHumanApproval: false,
      };
    }

    return {
      isStopCandidate: false,
      recommendedAction: "MAINTAIN",
      triggeredSignals: [],
      severity: "LOW",
      rationale: "Channel performance acceptable.",
      requiresHumanApproval: false,
    };
  }
}

export const stopRulesEvaluator = new StopRulesEvaluator();
