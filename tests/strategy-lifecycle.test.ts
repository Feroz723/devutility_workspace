import { describe, it, expect, vi, beforeEach } from "vitest";
import { productLifecycleGovernor } from "@/strategy/product-lifecycle-governor";
import { strategyRepo } from "@/database/repositories/strategy-repo";

import * as auditRepo from "@/database/repositories/audit-repo";

describe("Phase 13 — Product Lifecycle Governor & Switching Evaluation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);
  });

  it("blocks premature switching when observation window is in progress", async () => {
    vi.spyOn(strategyRepo, "getProductLifecycleState").mockResolvedValue({
      id: "life-1",
      product_id: "prod-1",
      lifecycle_stage: "LAUNCHED",
      discovered_at: new Date().toISOString(),
      launched_at: new Date().toISOString(),
      distribution_started_at: new Date().toISOString(),
      total_exposure_reach: 40,
      active_channels: ["CHANNEL_ORGANIC_X"],
      sample_sizes_summary: { visitors: 20, orders: 0 },
      experiments_conducted_count: 1,
      modifications_history: [],
      switching_evaluation: "CONTINUE",
      switching_rationale: "Early traffic",
      evidence_maturity_score: 25,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(strategyRepo, "listObservationWindows").mockResolvedValue([
      {
        id: "win-1",
        product_id: "prod-1",
        channel: "CHANNEL_ORGANIC_X",
        window_start: new Date().toISOString(),
        target_review_date: new Date(Date.now() + 86400000 * 5).toISOString(),
        min_sample_size_required: 50,
        actual_sample_size_collected: 20,
        timing_basis: "OBSERVED_INTERNAL",
        window_status: "IN_PROGRESS",
        waiting_reasons: ["Waiting for 50 samples"],
        next_decision_preview: "Assess conversion",
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    vi.spyOn(strategyRepo, "upsertProductLifecycleState").mockImplementation(async (input: any) => ({
      ...input,
      id: "life-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const result = await productLifecycleGovernor.evaluateSwitching("prod-1", false);
    expect(result.can_switch_or_stop).toBe(false);
    expect(result.blockers_to_switch).toContain(
      "Observation window is still in progress. Premature switching forbidden."
    );
    expect(result.evaluation).toBe("CONTINUE");
  });

  it("permits SCALE evaluation when strong conversion signals are observed", async () => {
    vi.spyOn(strategyRepo, "getProductLifecycleState").mockResolvedValue({
      id: "life-2",
      product_id: "prod-2",
      lifecycle_stage: "GROWING",
      discovered_at: new Date().toISOString(),
      launched_at: new Date().toISOString(),
      distribution_started_at: new Date().toISOString(),
      total_exposure_reach: 300,
      active_channels: ["CHANNEL_A", "CHANNEL_B"],
      sample_sizes_summary: { visitors: 150, orders: 8 },
      experiments_conducted_count: 3,
      modifications_history: [],
      switching_evaluation: "CONTINUE",
      switching_rationale: "Active",
      evidence_maturity_score: 85,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(strategyRepo, "listObservationWindows").mockResolvedValue([]);
    vi.spyOn(strategyRepo, "upsertProductLifecycleState").mockImplementation(async (input: any) => ({
      ...input,
      id: "life-2",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const result = await productLifecycleGovernor.evaluateSwitching("prod-2", false);
    expect(result.evaluation).toBe("SCALE");
    expect(result.can_switch_or_stop).toBe(true);
    expect(result.evidence_maturity_score).toBeGreaterThanOrEqual(70);
  });

  it("transitions lifecycle stages with recorded audit history", async () => {
    vi.spyOn(strategyRepo, "getProductLifecycleState").mockResolvedValue({
      id: "life-3",
      product_id: "prod-3",
      lifecycle_stage: "BUILDING",
      discovered_at: new Date().toISOString(),
      launched_at: null,
      distribution_started_at: null,
      total_exposure_reach: 0,
      active_channels: [],
      sample_sizes_summary: {},
      experiments_conducted_count: 0,
      modifications_history: [],
      switching_evaluation: "CONTINUE",
      switching_rationale: null,
      evidence_maturity_score: 10,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(strategyRepo, "upsertProductLifecycleState").mockImplementation(async (input: any) => ({
      ...input,
      id: "life-3",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const transitioned = await productLifecycleGovernor.transitionStage(
      "prod-3",
      "LAUNCHED",
      "Verified product artifacts built and tested",
      false
    );

    expect(transitioned.lifecycle_stage).toBe("LAUNCHED");
    expect(transitioned.modifications_history?.length).toBe(1);
    expect(transitioned.modifications_history?.[0].to).toBe("LAUNCHED");
  });
});
