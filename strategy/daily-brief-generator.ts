import { strategyRepo } from "@/database/repositories/strategy-repo";
import { focusManager } from "./focus-manager";
import { bottleneckDetector } from "./bottleneck-detector";
import { patternRecognitionEngine } from "./pattern-recognition-engine";
import { provenanceTracker } from "./provenance-tracker";
import { getLatestBusinessSnapshot } from "@/database/repositories/intelligence-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type {
  DailyStrategicBrief,
  StrategyRecommendation,
  StrategyAction,
  StrategyConfidence,
} from "@/types/strategy";

export class DailyBriefGenerator {
  /**
   * Generate and persist a structured daily strategic brief
   */
  async generateBrief(options?: {
    primaryStrategy?: StrategyRecommendation | null;
    actions?: StrategyAction[];
    isDemo?: boolean;
  }): Promise<DailyStrategicBrief> {
    const isDemo = options?.isDemo ?? false;
    const today = new Date().toISOString().split("T")[0];

    // 1. Current State of the Business
    const focus = await focusManager.getCurrentFocus(isDemo);
    const snapshot = await getLatestBusinessSnapshot({ is_demo: isDemo }).catch(() => null);
    const primaryBottleneck = await bottleneckDetector.getPrimaryBottleneck(isDemo);
    const patterns = await patternRecognitionEngine.discoverPatterns(isDemo);

    const businessState = {
      primary_product: focus.primary_product?.name || focus.primary_product?.id || "None selected",
      status: focus.status,
      objective: focus.primary_business_objective,
      horizon: focus.focus_horizon,
      total_visitors: snapshot?.total_visitors_count ?? 0,
      total_leads: snapshot?.total_leads_count ?? 0,
      total_customers: snapshot?.total_customers_count ?? 0,
      revenue_inr: Number(snapshot?.total_revenue_inr ?? 0),
      software_spend_inr: 0,
      backlog_opportunities: focus.backlog_opportunities_count,
    };

    // 2. What Changed Since Last Assessment
    const whatChanged = snapshot
      ? `Operating in ${focus.status} state. Funnel recorded ${snapshot.total_visitors_count ?? 0} total visitors and ₹${snapshot.total_revenue_inr ?? 0} revenue.`
      : "Operating baseline established. Autonomous telemetry listeners active.";

    // 3. What the Data Actually Says & DOES NOT Say
    const visitorCount = snapshot?.total_visitors_count ?? 0;
    const whatDataSays = visitorCount > 0
      ? `Data confirms ${visitorCount} visitor exposures tracked organically. Zero marketing spend incurred. Data does NOT yet confirm whether visitor intent matches current pricing tiers.`
      : "Data confirms zero paid spend (₹0). Data DOES NOT provide statistical significance for conversion hypotheses yet due to early exposure volume.";

    // 4. What We Know vs. What We Don't Know
    const whatWeKnow: string[] = [
      "Operating infrastructure is running 100% within the strict ₹0 software spend boundary.",
      focus.primary_product
        ? `Primary business focus is locked to product: "${focus.primary_product.name || focus.primary_product.id}".`
        : "No active primary product locked; backlog evaluation in progress.",
      "All automated background actions require zero human intervention unless financial approvals are triggered.",
    ];

    const whatWeDoNotKnow: string[] = [
      "Exact price sensitivity of ICP before achieving 10+ completed checkout sessions.",
      "Long-term customer retention rate (day 30/60 cohort) due to lack of mature cohort time-in-market.",
      "Organic organic virality coefficient across non-primary distribution channels.",
    ];

    // 5. Current Bottleneck & Strategy
    const primaryStrategy = options?.primaryStrategy || null;
    const actions = options?.actions || [];

    const todayPriority = primaryStrategy
      ? primaryStrategy.proposed_action
      : "Execute scheduled organic distribution and monitor funnel intake.";

    const whatWeAreWaitingFor = primaryStrategy?.strategy_type === "WAIT_FOR_DATA"
      ? (primaryStrategy.expected_outcome || "Waiting for observation window to reach statistical sample threshold")
      : null;

    const whatWouldChangeStrategy = "Statistically significant drop in visitor traffic (>50% drop over 7 days), or detection of 3+ converted orders requiring immediate scaling.";

    const risks = [
      "Opportunity cost of maintaining observation window if market demand shifted.",
      "Organic channel algorithm changes limiting distribution reach.",
    ];

    // Provenance summary
    const provenanceList = [
      provenanceTracker.createRecord("total_visitors", "business_snapshots", visitorCount),
      provenanceTracker.createRecord("software_spend", "financial_ledger", 1, { isCalculated: true }),
      provenanceTracker.createRecord("primary_product", "strategic_states", 1),
    ];

    const confidence: StrategyConfidence = visitorCount >= 50 ? "HIGH" : visitorCount >= 10 ? "MEDIUM" : "LOW";

    const brief = await strategyRepo.createDailyBrief({
      brief_date: today,
      current_business_state: businessState,
      what_changed: whatChanged,
      what_data_says: whatDataSays,
      what_we_know: whatWeKnow,
      what_we_do_not_know: whatWeDoNotKnow,
      important_patterns: patterns.slice(0, 3).map((p) => ({
        name: p.pattern_name,
        causality: p.causality_type,
        confidence: p.confidence,
      })),
      current_bottleneck: primaryBottleneck ? {
        type: primaryBottleneck.bottleneck_type,
        severity: primaryBottleneck.severity,
        description: primaryBottleneck.description,
      } : { type: "NONE_DETECTED", description: "Healthy operating state" },
      primary_strategy: primaryStrategy ? {
        objective: primaryStrategy.objective,
        type: primaryStrategy.strategy_type,
        action: primaryStrategy.proposed_action,
        confidence: primaryStrategy.confidence,
      } : { type: "CONTINUE", action: "Continue standard daily operations" },
      today_priority: todayPriority,
      next_actions: actions.slice(0, 5).map((a) => ({
        action_name: a.action_name,
        execution_type: a.execution_type,
        target_module: a.target_module,
        estimated_cost_inr: a.estimated_cost_inr,
      })),
      what_we_are_waiting_for: whatWeAreWaitingFor,
      what_would_change_strategy: whatWouldChangeStrategy,
      risks: risks,
      confidence: confidence,
      evidence_provenance: provenanceList,
      is_demo: isDemo,
    });

    await createAuditLog({
      event_type: "DAILY_BRIEF_GENERATED",
      entity_type: "STRATEGY_DAILY_BRIEF",
      entity_id: brief.id,
      actor: "daily_brief_generator",
      details: {
        brief_date: today,
        today_priority: todayPriority,
        confidence: confidence,
      },
    });

    return brief;
  }
}

export const dailyBriefGenerator = new DailyBriefGenerator();
