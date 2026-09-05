import { strategyRepo } from "@/database/repositories/strategy-repo";
import { getProductById } from "@/database/repositories/product-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type {
  ProductLifecycleState,
  ProductLifecycleStage,
  SwitchingEvaluation,
  ObservationWindow,
} from "@/types/strategy";

export interface LifecycleEvaluationResult {
  product_id: string;
  current_stage: ProductLifecycleStage;
  evaluation: SwitchingEvaluation;
  rationale: string;
  evidence_maturity_score: number;
  can_switch_or_stop: boolean;
  blockers_to_switch: string[];
  recommendations: string[];
}

export class ProductLifecycleGovernor {
  /**
   * Get or initialize product lifecycle state
   */
  async getOrInitLifecycleState(
    productId: string,
    isDemo: boolean = false
  ): Promise<ProductLifecycleState> {
    let state = await strategyRepo.getProductLifecycleState(productId);
    if (!state) {
      const product = await getProductById(productId);
      state = await strategyRepo.upsertProductLifecycleState({
        product_id: productId,
        lifecycle_stage: product?.status === "LIVE" ? "LAUNCHED" : "BUILDING",
        discovered_at: new Date().toISOString(),
        total_exposure_reach: 0,
        active_channels: [],
        sample_sizes_summary: {
          visitors: 0,
          signups: 0,
          orders: 0,
        },
        experiments_conducted_count: 0,
        modifications_history: [],
        switching_evaluation: "CONTINUE",
        switching_rationale: "Initial lifecycle assessment",
        evidence_maturity_score: 10,
        is_demo: isDemo,
      });
    }
    return state;
  }

  /**
   * Evaluate whether the product should continue, improve, scale, pause, stop, or replace
   */
  async evaluateSwitching(
    productId: string,
    isDemo: boolean = false
  ): Promise<LifecycleEvaluationResult> {
    const state = await this.getOrInitLifecycleState(productId, isDemo);
    const observationWindows = await strategyRepo.listObservationWindows(productId, isDemo);

    const blockers: string[] = [];
    let canSwitchOrStop = true;

    // Check 1: Observation window maturity
    const hasActiveWindow = observationWindows.some((w: ObservationWindow) => w.window_status === "IN_PROGRESS");
    const hasInsufficientExposure = observationWindows.some((w: ObservationWindow) => w.window_status === "INSUFFICIENT_EXPOSURE");

    if (hasActiveWindow) {
      blockers.push("Observation window is still in progress. Premature switching forbidden.");
      canSwitchOrStop = false;
    }
    if (hasInsufficientExposure) {
      blockers.push("Exposure reach is insufficient to conclude product-market fit failure.");
      canSwitchOrStop = false;
    }

    // Check 2: Sample size requirements
    const totalExposure = state.total_exposure_reach;
    const experimentsCount = state.experiments_conducted_count;
    const channelsCount = state.active_channels.length;

    if (totalExposure < 50) {
      blockers.push(`Total exposure is only ${totalExposure} (minimum 50 required for structural evaluation).`);
      canSwitchOrStop = false;
    }

    if (experimentsCount < 2 && state.lifecycle_stage !== "DISCOVERED") {
      blockers.push(`Only ${experimentsCount} experiments conducted. Must test iterations before abandoning.`);
      canSwitchOrStop = false;
    }

    // Determine evaluation
    let evaluation: SwitchingEvaluation = "CONTINUE";
    let rationale = "Product active in standard operating window.";
    const recommendations: string[] = [];

    const summary = state.sample_sizes_summary || {};
    const visitors = summary.visitors ?? 0;
    const orders = summary.orders ?? 0;

    if (orders >= 5 && visitors >= 100) {
      evaluation = "SCALE";
      rationale = "Validated conversion signals with 5+ orders and 100+ visitors. Safe to expand distribution.";
      recommendations.push("Increase distribution channel activities", "Test secondary acquisition angles");
    } else if (visitors >= 100 && orders === 0 && experimentsCount >= 3 && channelsCount >= 2) {
      evaluation = canSwitchOrStop ? "STOP" : "IMPROVE";
      rationale = canSwitchOrStop
        ? "Exhausted 3+ experiments and 2+ channels with 100+ visitors and 0 conversions. Ready to stop or replace."
        : "Low conversion detected, but observation window or iterations remain incomplete.";
      recommendations.push(
        canSwitchOrStop ? "Archive product and promote backlog opportunity" : "Iterate offer positioning"
      );
    } else if (visitors >= 30 && orders === 0) {
      evaluation = "IMPROVE";
      rationale = "Early visitor traffic detected with zero conversions. Optimize top/middle of funnel.";
      recommendations.push("Inspect landing page messaging", "Audit signup/checkout friction");
    } else {
      evaluation = "CONTINUE";
      rationale = "Collecting initial exposure data. Insufficient evidence to justify strategic pivot.";
      recommendations.push("Maintain current distribution rhythm", "Wait for observation window completion");
    }

    // Evidence maturity score calculation (0 - 100)
    const evidenceMaturityScore = Math.min(
      100,
      Math.round(
        (Math.min(visitors, 100) * 0.4) +
        (Math.min(orders, 10) * 4) +
        (Math.min(experimentsCount, 3) * 6.6)
      )
    );

    // Update state in repository
    const updated = await strategyRepo.upsertProductLifecycleState({
      id: state.id,
      product_id: productId,
      switching_evaluation: evaluation,
      switching_rationale: rationale,
      evidence_maturity_score: evidenceMaturityScore,
      is_demo: isDemo,
    });

    await createAuditLog({
      event_type: "SWITCHING_DECISION_EVALUATED",
      entity_type: "PRODUCT_LIFECYCLE",
      entity_id: productId,
      actor: "product_lifecycle_governor",
      details: {
        evaluation,
        rationale,
        evidence_maturity_score: evidenceMaturityScore,
        can_switch_or_stop: canSwitchOrStop,
        blockers,
      },
    });

    return {
      product_id: productId,
      current_stage: updated.lifecycle_stage,
      evaluation,
      rationale,
      evidence_maturity_score: evidenceMaturityScore,
      can_switch_or_stop: canSwitchOrStop,
      blockers_to_switch: blockers,
      recommendations,
    };
  }

  /**
   * Advance or transition product lifecycle stage
   */
  async transitionStage(
    productId: string,
    newStage: ProductLifecycleStage,
    reason: string,
    isDemo: boolean = false
  ): Promise<ProductLifecycleState> {
    const state = await this.getOrInitLifecycleState(productId, isDemo);
    const history = Array.isArray(state.modifications_history) ? [...state.modifications_history] : [];
    history.push({
      from: state.lifecycle_stage,
      to: newStage,
      reason,
      timestamp: new Date().toISOString(),
    });

    return strategyRepo.upsertProductLifecycleState({
      id: state.id,
      product_id: productId,
      lifecycle_stage: newStage,
      modifications_history: history,
      is_demo: isDemo,
    });
  }
}

export const productLifecycleGovernor = new ProductLifecycleGovernor();
