import { describe, it, expect, vi, beforeEach } from "vitest";
import { RealBusinessCycleRunner } from "@/operations/real-cycle";
import { focusManager } from "@/strategy/focus-manager";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { strategyEngine } from "@/strategy/strategy-engine";
import { deploymentManager } from "@/deployment/deployment-manager";
import * as oppRepo from "@/database/repositories/opportunity-repo";
import * as prodRepo from "@/database/repositories/product-repo";
import * as client from "@/database/client";

describe("Phase 15: Real Business Cycle & Backlog Governance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("aborts execution immediately when emergency kill switch is active", async () => {
    vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
      is_kill_switch_active: true,
      is_paused: false,
    } as any);

    const runner = new RealBusinessCycleRunner();
    await expect(runner.runRealCycle()).rejects.toThrow("Emergency Kill Switch is ACTIVE");
  });

  it("maintains focus on primary product and routes new incoming opportunities to backlog", async () => {
    vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
      is_kill_switch_active: false,
      is_paused: false,
    } as any);

    const activeProduct = {
      id: "prod-primary-001",
      name: "Primary Active Tool",
      slug: "primary-active-tool",
      status: "LAUNCHED",
      build_status: "BUILT",
      version: "1.0.0",
      product_url: "http://localhost:3000/p/primary-active-tool",
      is_demo: false,
    };

    vi.spyOn(focusManager, "getCurrentFocus").mockResolvedValue({
      primary_product: activeProduct,
      primary_experiment: null,
      primary_business_objective: "ACHIEVE_FIRST_RETAINED_CUSTOMER",
      focus_horizon: "TODAY",
      status: "ACTIVE",
      backlog_opportunities_count: 5,
      is_demo: false,
    });

    const routeSpy = vi.spyOn(focusManager, "routeOpportunity").mockResolvedValue({
      routing_decision: "QUEUED_IN_BACKLOG",
      current_focus_product_id: activeProduct.id,
      message: "Queued in backlog",
      action: "ROUTED_TO_BACKLOG",
    });

    vi.spyOn(oppRepo, "listOpportunities").mockResolvedValue({
      opportunities: [
        { id: "opp-new-1", title: "New Discovered Opportunity 1", status: "new" },
        { id: "opp-new-2", title: "New Discovered Opportunity 2", status: "new" },
      ],
      total: 2,
    } as any);

    vi.spyOn(deploymentManager, "deployProduct").mockResolvedValue({
      deployment: {
        id: "dep-001",
        product_id: activeProduct.id,
        version: "1.0.0",
        provider: "SELF_HOSTED",
        status: "DEPLOYED",
        public_url: "http://localhost:3000/p/primary-active-tool",
        is_verified: true,
        verification_details: {},
        is_demo: false,
      },
      adapterResult: {
        status: "DEPLOYED",
        provider: "SELF_HOSTED",
        publicUrl: "http://localhost:3000/p/primary-active-tool",
      },
    });

    vi.spyOn(client, "queryOne")
      .mockResolvedValueOnce({ visitors: "12", page_views: "45", core_actions: "18" } as any)
      .mockResolvedValueOnce({ count: "3" } as any);

    vi.spyOn(strategyEngine, "evaluateStrategy").mockResolvedValue({
      primary_strategy: {
        strategy_type: "ORGANIC_DISTRIBUTION_EXPANSION",
        title: "Expand Organic Traffic Loop",
        bottleneck_target: "EXPOSURE",
        confidence: 85,
        success_metrics: { waiting_for: "100 unique real visitors" },
      },
      prioritized_actions: [
        { title: "Optimize SEO metadata on public utility page" },
        { title: "Publish open source repository on GitHub" },
        { title: "Monitor core action completion rate" },
      ],
    } as any);

    const runner = new RealBusinessCycleRunner();
    const result = await runner.runRealCycle();

    expect(result.primaryProduct.id).toBe("prod-primary-001");
    expect(result.primaryProduct.name).toBe("Primary Active Tool");
    expect(result.zeroSpendEnforced).toBe(true);
    expect(result.totalSpendInr).toBe(0);
    expect(result.realEventsObserved.visitors).toBe(12);
    expect(result.realEventsObserved.feedbackEntries).toBe(3);
    expect(result.strategyDecision?.primaryBottleneck).toBe("EXPOSURE");
    expect(routeSpy).toHaveBeenCalled();
  });
});
