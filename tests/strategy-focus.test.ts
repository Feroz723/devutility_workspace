import { describe, it, expect, vi, beforeEach } from "vitest";
import { focusManager } from "@/strategy/focus-manager";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import * as productRepo from "@/database/repositories/product-repo";
import * as opportunityRepo from "@/database/repositories/opportunity-repo";

import * as auditRepo from "@/database/repositories/audit-repo";

describe("Phase 13 — Strategy Focus & Backlog Isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);
  });

  it("preserves single primary focus and locks active product", async () => {
    vi.spyOn(strategyRepo, "getStrategicState").mockResolvedValue({
      id: "strat-1",
      primary_active_product_id: "prod-1",
      primary_active_experiment_id: "exp-1",
      primary_business_objective: "ACHIEVE_FIRST_RETAINED_CUSTOMER",
      primary_strategy_id: "strat-rec-1",
      focus_horizon: "TODAY",
      status: "ACTIVE",
      operating_period_date: "2026-09-05",
      state_summary: {},
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(productRepo, "getProductById").mockResolvedValue({
      id: "prod-1",
      name: "AI SEO Generator",
      status: "LIVE",
    } as any);

    vi.spyOn(opportunityRepo, "listOpportunities").mockResolvedValue({
      opportunities: [],
      total: 5,
      page: 1,
      limit: 10,
    });

    const focus = await focusManager.getCurrentFocus(false);
    expect(focus.primary_product?.name).toBe("AI SEO Generator");
    expect(focus.status).toBe("ACTIVE");
    expect(focus.backlog_opportunities_count).toBe(5);
  });

  it("routes new opportunities to backlog without displacing primary active product", async () => {
    vi.spyOn(strategyRepo, "getStrategicState").mockResolvedValue({
      id: "strat-1",
      primary_active_product_id: "prod-active",
      primary_active_experiment_id: null,
      primary_business_objective: "ACHIEVE_FIRST_RETAINED_CUSTOMER",
      primary_strategy_id: null,
      focus_horizon: "TODAY",
      status: "ACTIVE",
      operating_period_date: "2026-09-05",
      state_summary: {},
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(productRepo, "getProductById").mockResolvedValue({
      id: "prod-active",
      name: "Active SaaS Product",
      status: "LIVE",
    } as any);

    const routeResult = await focusManager.routeOpportunityToBacklog(
      "opp-new",
      "Exciting Brand New Idea",
      false
    );

    expect(routeResult.action).toBe("ROUTED_TO_BACKLOG");
    expect(routeResult.routed_to).toBe("OPPORTUNITY_BACKLOG");
    expect(routeResult.current_primary_id).toBe("prod-active");
  });

  it("updates primary focus when explicitly commanded with audit trail", async () => {
    vi.spyOn(strategyRepo, "getStrategicState").mockResolvedValue(null);
    vi.spyOn(strategyRepo, "upsertStrategicState").mockImplementation(async (input: any) => ({
      id: "strat-updated",
      primary_active_product_id: input.primary_active_product_id,
      primary_active_experiment_id: input.primary_active_experiment_id,
      primary_business_objective: input.primary_business_objective,
      primary_strategy_id: null,
      focus_horizon: input.focus_horizon,
      status: input.status,
      operating_period_date: "2026-09-05",
      state_summary: input.state_summary,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const updated = await focusManager.setPrimaryFocus({
      productId: "prod-new-primary",
      objective: "SCALE_REVENUE_INR",
      reason: "Prior product reached scale validation criteria",
      isDemo: false,
    });

    expect(updated.primary_active_product_id).toBe("prod-new-primary");
    expect(updated.primary_business_objective).toBe("SCALE_REVENUE_INR");
  });
});
