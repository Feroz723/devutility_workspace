import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitStrategyEvaluator } from "@/strategy/wait-strategy-evaluator";
import { strategyRepo } from "@/database/repositories/strategy-repo";

describe("Phase 13 — First-Class Wait-for-Data Strategy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("identifies active observation window and recommends waiting with clear reassessment triggers", async () => {
    vi.spyOn(strategyRepo, "listObservationWindows").mockResolvedValue([
      {
        id: "win-test",
        product_id: "prod-1",
        channel: "ORGANIC_LINKEDIN",
        window_start: new Date().toISOString(),
        target_review_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        min_sample_size_required: 50,
        actual_sample_size_collected: 18,
        timing_basis: "OBSERVED_INTERNAL",
        window_status: "IN_PROGRESS",
        waiting_reasons: ["Collecting statistical baseline"],
        next_decision_preview: "Assess conversion rate",
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    const result = await waitStrategyEvaluator.evaluateWaitStrategy("prod-1", false);
    expect(result.should_wait).toBe(true);
    expect(result.wait_reason).toContain("Need 32 more samples");
    expect(result.safe_background_actions.length).toBeGreaterThan(0);
    expect(result.reassessment_triggers).toContain("Collected samples reaches 50");
  });

  it("builds a structured WAIT_FOR_DATA strategy recommendation", async () => {
    const waitEval = {
      should_wait: true,
      wait_reason: "Collecting data",
      target_metrics: ["sample_size >= 50"],
      expected_review_date: "2026-09-12T00:00:00.000Z",
      active_window: {
        id: "win-1",
        actual_sample_size_collected: 10,
        min_sample_size_required: 50,
      } as any,
      safe_background_actions: ["Keep distribution running"],
      reassessment_triggers: ["Samples reach 50"],
    };

    const rec = waitStrategyEvaluator.buildWaitRecommendation("prod-1", waitEval, false);
    expect(rec.strategy_type).toBe("WAIT_FOR_DATA");
    expect(rec.rank_order).toBe(1);
    expect(rec.is_primary).toBe(true);
    expect(rec.resource_requirements.spend_inr).toBe(0);
  });
});
