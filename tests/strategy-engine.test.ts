import { describe, it, expect, vi, beforeEach } from "vitest";
import { strategyEngine } from "@/strategy/strategy-engine";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import { focusManager } from "@/strategy/focus-manager";
import { funnelAnalysisEngine } from "@/strategy/funnel-analysis-engine";
import { bottleneckDetector } from "@/strategy/bottleneck-detector";
import { patternRecognitionEngine } from "@/strategy/pattern-recognition-engine";
import { dailyBriefGenerator } from "@/strategy/daily-brief-generator";
import { productLifecycleGovernor } from "@/strategy/product-lifecycle-governor";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Phase 13 — Strategy Engine & Primary Strategy Selection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);
    vi.spyOn(productLifecycleGovernor, "evaluateSwitching").mockResolvedValue({
      product_id: "00000000-0000-0000-0000-000000000001",
      current_stage: "LAUNCHED",
      evaluation: "CONTINUE",
      rationale: "Active operating cadence",
      evidence_maturity_score: 50,
      can_switch_or_stop: false,
      blockers_to_switch: [],
      recommendations: [],
    });
  });

  it("selects ONE primary strategy and generates 3-5 prioritized actions", async () => {
    vi.spyOn(focusManager, "getCurrentFocus").mockResolvedValue({
      primary_product: { id: "00000000-0000-0000-0000-000000000001", name: "AI Tool" },
      primary_experiment: null,
      primary_business_objective: "ACHIEVE_FIRST_RETAINED_CUSTOMER",
      focus_horizon: "TODAY",
      status: "ACTIVE",
      backlog_opportunities_count: 2,
      is_demo: false,
    });

    vi.spyOn(funnelAnalysisEngine, "analyzeFunnel").mockResolvedValue([]);
    vi.spyOn(bottleneckDetector, "detectBottlenecks").mockResolvedValue([
      {
        id: "bot-1",
        bottleneck_type: "awareness",
        is_primary: true,
        severity: "HIGH",
        magnitude_score: 80,
        business_impact_score: 85,
        sample_size: 15,
        reversibility: "HIGH",
        description: "Low top of funnel reach",
        recommended_focus: "Launch organic social cadence",
      } as any,
    ]);

    vi.spyOn(patternRecognitionEngine, "discoverPatterns").mockResolvedValue([]);

    vi.spyOn(strategyRepo, "getStrategicState").mockResolvedValue({
      id: "state-1",
      primary_strategy_id: "old-strat",
      focus_horizon: "TODAY",
      status: "ACTIVE",
    } as any);

    vi.spyOn(strategyRepo, "getRecommendation").mockResolvedValue({
      id: "old-strat",
      objective: "OLD_OBJECTIVE",
      strategy_type: "CONTINUE",
    } as any);

    vi.spyOn(strategyRepo, "createRecommendation").mockImplementation(async (rec: any) => ({
      ...rec,
      id: "rec-new",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    vi.spyOn(strategyRepo, "createStrategyChange").mockResolvedValue({} as any);
    vi.spyOn(strategyRepo, "createAction").mockImplementation(async (a: any) => ({
      ...a,
      id: `act-${Math.random()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    vi.spyOn(strategyRepo, "upsertStrategicState").mockImplementation(async (s: any) => ({
      ...s,
      id: "state-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    vi.spyOn(dailyBriefGenerator, "generateBrief").mockResolvedValue({
      id: "brief-1",
      brief_date: "2026-09-05",
      today_priority: "Launch organic social cadence",
    } as any);

    const result = await strategyEngine.evaluateStrategy({
      isDemo: false,
      reason: "Unit test evaluation run",
    });

    expect(result.primary_strategy).toBeDefined();
    expect(result.primary_strategy.is_primary).toBe(true);
    expect(result.prioritized_actions.length).toBeGreaterThanOrEqual(3);
    expect(result.prioritized_actions.length).toBeLessThanOrEqual(5);

    // Verify all actions have zero spend
    for (const act of result.prioritized_actions) {
      expect(act.estimated_cost_inr).toBe(0);
    }
  });
});
