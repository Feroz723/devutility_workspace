import { strategyRepo } from "@/database/repositories/strategy-repo";
import { focusManager } from "./focus-manager";
import { productLifecycleGovernor } from "./product-lifecycle-governor";
import { observationWindowEngine } from "./observation-window-engine";
import { waitStrategyEvaluator } from "./wait-strategy-evaluator";
import { funnelAnalysisEngine } from "./funnel-analysis-engine";
import { bottleneckDetector } from "./bottleneck-detector";
import { patternRecognitionEngine } from "./pattern-recognition-engine";
import { strategySimulationEngine, type StrategyOption } from "./strategy-simulation-engine";
import { dailyBriefGenerator } from "./daily-brief-generator";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type {
  StrategicState,
  StrategyRecommendation,
  StrategyAction,
  DailyStrategicBrief,
  StrategyConfidence,
} from "@/types/strategy";

export interface StrategyEvaluationResult {
  state: StrategicState;
  primary_strategy: StrategyRecommendation;
  prioritized_actions: StrategyAction[];
  daily_brief: DailyStrategicBrief;
  is_demo: boolean;
}

export class StrategyEngine {
  /**
   * Run complete strategic intelligence evaluation loop
   */
  async evaluateStrategy(options?: {
    isDemo?: boolean;
    forceReassessment?: boolean;
    reason?: string;
  }): Promise<StrategyEvaluationResult> {
    const isDemo = options?.isDemo ?? false;
    const reason = options?.reason || "Scheduled autonomous strategic evaluation";

    // 1. Resolve Single Primary Business Focus
    const focus = await focusManager.getCurrentFocus(isDemo);
    const productId = focus.primary_product?.id || null;

    // 2. Lifecycle & Switching Assessment
    let lifecycleEval = null;
    if (productId) {
      lifecycleEval = await productLifecycleGovernor.evaluateSwitching(productId, isDemo);
    }

    // 3. Observation Window & Wait Strategy
    let waitEval = null;
    if (productId) {
      waitEval = await waitStrategyEvaluator.evaluateWaitStrategy(productId, isDemo);
    }

    // 4. Funnel Analysis & Bottleneck Detection
    const funnelStages = await funnelAnalysisEngine.analyzeFunnel(productId, isDemo);
    const bottlenecks = await bottleneckDetector.detectBottlenecks(productId, isDemo);
    const primaryBottleneck = bottlenecks.find((b) => b.is_primary) || bottlenecks[0];

    // 5. Pattern Discovery
    await patternRecognitionEngine.discoverPatterns(isDemo);

    // 6. Generate Candidate Strategy Options
    const candidateOptions: StrategyOption[] = [];

    // Option A: Wait for data if observation window is in progress
    if (waitEval && waitEval.should_wait && productId) {
      const waitRec = waitStrategyEvaluator.buildWaitRecommendation(productId, waitEval, isDemo);
      candidateOptions.push(waitRec as StrategyOption);
    }

    // Option B: Address Primary Bottleneck
    if (primaryBottleneck) {
      candidateOptions.push({
        objective: `RESOLVE_${primaryBottleneck.bottleneck_type.toUpperCase()}_BOTTLENECK`,
        problem_addressed: primaryBottleneck.description,
        proposed_action: primaryBottleneck.recommended_focus || `Optimize ${primaryBottleneck.bottleneck_type}`,
        strategy_type: "IMPROVE",
        horizon: "TODAY",
        evidence_provenance: "OBSERVED",
        evidence_summary: {
          bottleneck_id: primaryBottleneck.id,
          severity: primaryBottleneck.severity,
          impact_score: primaryBottleneck.business_impact_score,
        },
        confidence: (primaryBottleneck.sample_size >= 10 ? "HIGH" : "MEDIUM") as StrategyConfidence,
        expected_outcome: `Eliminate primary throughput bottleneck in ${primaryBottleneck.bottleneck_type} to lift funnel conversion.`,
        assumptions: ["Bottleneck friction is addressable with internal software adjustments"],
        resource_requirements: { spend_inr: 0, execution: "AUTOMATIC" },
        risks: ["Opportunity cost while optimizing specific funnel step"],
        reversibility: "HIGH",
        observation_requirements: { target_samples: 30 },
        success_criteria: `Funnel progression from ${primaryBottleneck.bottleneck_type} improves by at least 20%`,
        failure_criteria: "Conversion remains zero after 50 new visitor exposures",
      });
    }

    // Option C: Lifecycle Continue / Scale option
    if (lifecycleEval) {
      candidateOptions.push({
        objective: `${lifecycleEval.evaluation}_ACTIVE_PRODUCT_LIFECYCLE`,
        problem_addressed: "Ensuring structured product progression through operating lifecycle",
        proposed_action: lifecycleEval.rationale,
        strategy_type: lifecycleEval.evaluation as any,
        horizon: "PRODUCT_LIFECYCLE",
        evidence_provenance: "OBSERVED",
        evidence_summary: {
          lifecycle_stage: lifecycleEval.current_stage,
          maturity_score: lifecycleEval.evidence_maturity_score,
        },
        confidence: (lifecycleEval.evidence_maturity_score >= 50 ? "HIGH" : "MEDIUM") as StrategyConfidence,
        expected_outcome: "Maintain rigorous, data-backed cadence without premature pivots.",
        assumptions: ["Current market category has active organic intent"],
        resource_requirements: { spend_inr: 0, execution: "AUTOMATIC" },
        risks: ["Market saturation or delayed feedback loop"],
        reversibility: "HIGH",
        observation_requirements: { review_in_days: 7 },
        success_criteria: "Attain mature evidence score (>70)",
        failure_criteria: "Zero traction sustained across 3 consecutive cycles",
      });
    }

    // Fallback Option D: Standard Organic Growth
    if (candidateOptions.length === 0) {
      candidateOptions.push({
        objective: "ESTABLISH_BASELINE_DISTRIBUTION",
        problem_addressed: "Lack of baseline exposure traffic",
        proposed_action: "Execute organic distribution schedule and monitor intake signals",
        strategy_type: "CONTINUE",
        horizon: "TODAY",
        evidence_provenance: "CALCULATED",
        evidence_summary: { note: "Telemetry baseline setup" },
        confidence: "MEDIUM",
        expected_outcome: "Generate initial 30 organic visits at ₹0 spend.",
        assumptions: ["Organic channels permit automated scheduled publishing"],
        resource_requirements: { spend_inr: 0, execution: "AUTOMATIC" },
        risks: ["Organic algorithmic throttling"],
        reversibility: "HIGH",
        observation_requirements: { target_visits: 30 },
        success_criteria: "Reach 30 unique visits",
        failure_criteria: "Zero reach after 7 days",
      });
    }

    // 7. Deterministically Rank & Select ONE Primary Strategy
    const ranked = strategySimulationEngine.rankStrategies(
      candidateOptions,
      focus.primary_business_objective
    );
    const chosen = ranked[0];
    if (!chosen) {
      throw new Error("No strategic options available for evaluation");
    }

    // Check if strategy changed from previous
    const previousState = await strategyRepo.getStrategicState(isDemo);
    let previousStrategy: StrategyRecommendation | null = null;
    if (previousState?.primary_strategy_id) {
      previousStrategy = await strategyRepo.getRecommendation(previousState.primary_strategy_id);
    }

    // Save chosen recommendation
    const primaryRecommendation = await strategyRepo.createRecommendation({
      objective: chosen.objective,
      problem_addressed: chosen.problem_addressed,
      proposed_action: chosen.proposed_action,
      strategy_type: chosen.strategy_type,
      horizon: chosen.horizon,
      evidence_provenance: chosen.evidence_provenance,
      evidence_summary: chosen.evidence_summary,
      confidence: chosen.confidence,
      expected_outcome: chosen.expected_outcome,
      assumptions: chosen.assumptions,
      resource_requirements: chosen.resource_requirements,
      risks: chosen.risks,
      reversibility: chosen.reversibility,
      observation_requirements: chosen.observation_requirements,
      success_criteria: chosen.success_criteria,
      failure_criteria: chosen.failure_criteria,
      rank_order: 1,
      is_primary: true,
      status: "ACTIVE",
      is_demo: isDemo,
    });

    // Record strategy change if different
    if (previousStrategy && previousStrategy.objective !== primaryRecommendation.objective) {
      await strategyRepo.createStrategyChange({
        old_strategy_id: previousStrategy.id,
        new_strategy_id: primaryRecommendation.id,
        old_strategy_name: previousStrategy.objective,
        new_strategy_name: primaryRecommendation.objective,
        trigger_reason: reason,
        evidence_diff: {
          previous_type: previousStrategy.strategy_type,
          new_type: primaryRecommendation.strategy_type,
          bottleneck: primaryBottleneck?.bottleneck_type,
        },
        confidence: primaryRecommendation.confidence,
        is_demo: isDemo,
      });

      await createAuditLog({
        event_type: "STRATEGY_CHANGED",
        entity_type: "STRATEGY",
        entity_id: primaryRecommendation.id,
        actor: "strategy_engine",
        details: {
          from: previousStrategy.objective,
          to: primaryRecommendation.objective,
          reason,
        },
      });
    }

    // 8. Generate 3–5 Prioritized Concrete Actions
    // Strict zero spend discipline: ₹0 cost is AUTOMATIC. Any > ₹0 requires approval.
    const actionsToCreate = [
      {
        priority: 1,
        name: primaryRecommendation.strategy_type === "WAIT_FOR_DATA"
          ? "Maintain Observation Window Telemetry Listeners"
          : `Address ${primaryBottleneck?.bottleneck_type || "Funnel"} Friction Point`,
        description: primaryRecommendation.proposed_action,
        module: primaryRecommendation.strategy_type === "WAIT_FOR_DATA" ? "RUNTIME" : "INTELLIGENCE",
        action: "EXECUTE_STRATEGIC_STEP",
        executionType: (primaryRecommendation.strategy_type === "WAIT_FOR_DATA" ? "WAITING" : "AUTOMATIC") as any,
        cost: 0,
      },
      {
        priority: 2,
        name: "Execute Organic Distribution Loop",
        description: "Publish scheduled organic distribution messages across verified zero-cost channels",
        module: "DISTRIBUTION",
        action: "SCHEDULE_POSTS",
        executionType: "AUTOMATIC" as any,
        cost: 0,
      },
      {
        priority: 3,
        name: "Monitor Health & Inbound Customer Signals",
        description: "Scan customer tickets, logs, and checkout metrics for friction anomalies",
        module: "CUSTOMER_SUCCESS",
        action: "SCAN_SIGNALS",
        executionType: "AUTOMATIC" as any,
        cost: 0,
      },
      {
        priority: 4,
        name: "Sync Operational Metrics to Decision Ledger",
        description: "Aggregate latest funnel progression counts and record business snapshot",
        module: "INTELLIGENCE",
        action: "RECORD_SNAPSHOT",
        executionType: "AUTOMATIC" as any,
        cost: 0,
      },
    ];

    const savedActions: StrategyAction[] = [];
    for (const a of actionsToCreate) {
      const act = await strategyRepo.createAction({
        strategy_id: primaryRecommendation.id,
        priority_order: a.priority,
        action_name: a.name,
        description: a.description,
        target_module: a.module,
        target_action: a.action,
        execution_type: a.executionType,
        status: "PENDING",
        estimated_cost_inr: a.cost,
        payload: { zero_spend_verified: true },
        is_demo: isDemo,
      });
      savedActions.push(act);
    }

    // 9. Update Strategic State
    const updatedState = await strategyRepo.upsertStrategicState({
      primary_active_product_id: productId,
      primary_strategy_id: primaryRecommendation.id,
      primary_business_objective: primaryRecommendation.objective,
      focus_horizon: primaryRecommendation.horizon,
      status: primaryRecommendation.strategy_type === "WAIT_FOR_DATA" ? "WAITING_FOR_DATA" : "ACTIVE",
      state_summary: {
        last_evaluation_reason: reason,
        bottleneck: primaryBottleneck?.bottleneck_type,
        chosen_strategy: primaryRecommendation.objective,
      },
      is_demo: isDemo,
    });

    // 10. Generate Daily Strategic Brief
    const dailyBrief = await dailyBriefGenerator.generateBrief({
      primaryStrategy: primaryRecommendation,
      actions: savedActions,
      isDemo: isDemo,
    });

    await createAuditLog({
      event_type: "STRATEGY_EVALUATED",
      entity_type: "STRATEGY",
      entity_id: primaryRecommendation.id,
      actor: "strategy_engine",
      details: {
        primary_strategy_id: primaryRecommendation.id,
        strategy_type: primaryRecommendation.strategy_type,
        bottleneck: primaryBottleneck?.bottleneck_type,
        actions_count: savedActions.length,
      },
    });

    return {
      state: updatedState,
      primary_strategy: primaryRecommendation,
      prioritized_actions: savedActions,
      daily_brief: dailyBrief,
      is_demo: isDemo,
    };
  }
}

export const strategyEngine = new StrategyEngine();
