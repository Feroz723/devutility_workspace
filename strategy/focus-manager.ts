import { strategyRepo } from "@/database/repositories/strategy-repo";
import { getProductById, listProducts } from "@/database/repositories/product-repo";
import { listExperiments } from "@/database/repositories/experiment-repo";
import { listOpportunities } from "@/database/repositories/opportunity-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { StrategicState, StrategicHorizon, StrategicStatus } from "@/types/strategy";

export interface PrimaryFocusResult {
  primary_product: any | null;
  primary_experiment: any | null;
  primary_business_objective: string;
  focus_horizon: StrategicHorizon;
  status: StrategicStatus;
  backlog_opportunities_count: number;
  is_demo: boolean;
}

export class FocusManager {
  /**
   * Get the single primary business focus state
   */
  async getCurrentFocus(isDemo: boolean = false): Promise<PrimaryFocusResult> {
    let state = await strategyRepo.getStrategicState(isDemo);

    // If no state exists yet, initialize a default focused state
    if (!state) {
      // Find top active product or first product
      const { products } = await listProducts({ is_demo: isDemo, limit: 1 });
      const primaryProduct = products.length > 0 ? products[0] : null;

      // Find active experiment if any
      const { experiments } = await listExperiments({ limit: 1 });
      const primaryExperiment = experiments.length > 0 ? experiments[0] : null;

      state = await strategyRepo.upsertStrategicState({
        primary_active_product_id: primaryProduct ? primaryProduct.id : null,
        primary_active_experiment_id: primaryExperiment ? primaryExperiment.id : null,
        primary_business_objective: "ACHIEVE_FIRST_RETAINED_CUSTOMER",
        focus_horizon: "TODAY",
        status: "ACTIVE",
        operating_period_date: new Date().toISOString().split("T")[0],
        state_summary: {
          initial_setup: true,
          focus_rule: "SINGLE_PRIMARY_FOCUS_ENFORCED",
        },
        is_demo: isDemo,
      });
    }

    // Resolve entities
    const primaryProduct = state.primary_active_product_id
      ? await getProductById(state.primary_active_product_id)
      : null;

    // Get count of queued opportunities in backlog
    const { total: backlogCount } = await listOpportunities({
      status: "new",
    });

    return {
      primary_product: primaryProduct,
      primary_experiment: state.primary_active_experiment_id ? { id: state.primary_active_experiment_id } : null,
      primary_business_objective: state.primary_business_objective,
      focus_horizon: state.focus_horizon,
      status: state.status,
      backlog_opportunities_count: backlogCount,
      is_demo: isDemo,
    };
  }

  /**
   * Set or switch primary active product
   */
  async setPrimaryFocus(input: {
    productId?: string | null;
    experimentId?: string | null;
    objective?: string;
    horizon?: StrategicHorizon;
    status?: StrategicStatus;
    reason: string;
    isDemo?: boolean;
  }): Promise<StrategicState> {
    const isDemo = input.isDemo ?? false;
    const currentState = await strategyRepo.getStrategicState(isDemo);

    const updated = await strategyRepo.upsertStrategicState({
      primary_active_product_id: input.productId !== undefined ? input.productId : currentState?.primary_active_product_id,
      primary_active_experiment_id: input.experimentId !== undefined ? input.experimentId : currentState?.primary_active_experiment_id,
      primary_business_objective: input.objective || currentState?.primary_business_objective || "ACHIEVE_FIRST_RETAINED_CUSTOMER",
      focus_horizon: input.horizon || currentState?.focus_horizon || "TODAY",
      status: input.status || currentState?.status || "ACTIVE",
      operating_period_date: new Date().toISOString().split("T")[0],
      state_summary: {
        last_reason: input.reason,
        updated_at: new Date().toISOString(),
      },
      is_demo: isDemo,
    });

    await createAuditLog({
      event_type: "DECISION_CREATED",
      entity_type: "STRATEGY",
      entity_id: updated.id,
      actor: "focus_manager",
      details: {
        decision_subtype: "PRIMARY_FOCUS_UPDATED",
        product_id: updated.primary_active_product_id,
        experiment_id: updated.primary_active_experiment_id,
        objective: updated.primary_business_objective,
        reason: input.reason,
        is_demo: isDemo,
      },
    }).catch(() => null);

    return updated;
  }

  /**
   * Protect primary focus: Add incoming opportunity to backlog, rejecting immediate disruption
   */
  async routeOpportunityToBacklog(opportunityId: string, title: string, isDemo: boolean = false) {
    const current = await this.getCurrentFocus(isDemo);

    // If no primary product is set yet, check if we should adopt this opportunity
    if (!current.primary_product) {
      return {
        action: "QUEUED_FOR_EVALUATION",
        message: `Opportunity ${title} received. No primary product active. Ready for validation/build cycle.`,
        routed_to: "OPPORTUNITY_BACKLOG",
      };
    }

    // Otherwise strictly preserve focus and protect primary active product
    return {
      action: "ROUTED_TO_BACKLOG",
      message: `Preserving focus on active product ${current.primary_product.name || current.primary_product.id}. Opportunity ${title} queued in backlog.`,
      routed_to: "OPPORTUNITY_BACKLOG",
      current_primary_id: current.primary_product.id,
    };
  }

  /**
   * Shorthand routing helper for automated scenarios and pipelines
   */
  async routeOpportunity(opportunityId: string, isDemo: boolean = false) {
    const result = await this.routeOpportunityToBacklog(opportunityId, "Incoming Opportunity", isDemo);
    return {
      routing_decision: "QUEUED_IN_BACKLOG",
      current_focus_product_id: result.current_primary_id || null,
      message: result.message,
      action: result.action,
    };
  }
}

export const focusManager = new FocusManager();
