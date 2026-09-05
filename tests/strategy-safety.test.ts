import { describe, it, expect, vi, beforeEach } from "vitest";
import { strategyExecutor } from "@/strategy/strategy-executor";
import { learningLoopEngine } from "@/strategy/learning-loop-engine";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import { jobManager } from "@/operations/job-manager";

import * as auditRepo from "@/database/repositories/audit-repo";

describe("Phase 13 — Strategy Safety, Zero Spend & Learning Loop", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);
  });

  it("strictly blocks auto-execution of any action with cost > ₹0", async () => {
    vi.spyOn(strategyRepo, "getAction").mockResolvedValue({
      id: "act-paid",
      strategy_id: "strat-1",
      priority_order: 1,
      action_name: "Run Paid Google Ads Campaign",
      description: "Paid traffic boost",
      target_module: "DISTRIBUTION",
      target_action: "RUN_PAID_ADS",
      execution_type: "AUTOMATIC",
      status: "PENDING",
      estimated_cost_inr: 500, // VIOLATION of ₹0 spend rule
      payload: {},
      linked_job_id: null,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(strategyRepo, "updateActionStatus").mockResolvedValue({} as any);
    const submitSpy = vi.spyOn(jobManager, "submitJob");

    const result = await strategyExecutor.executeAction("act-paid", false);

    expect(result.status).toBe("WAITING_FOR_DATA");
    expect(result.message).toContain("Auto-execution blocked under ₹0 spend rule");
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("submits job for zero-cost AUTOMATIC actions", async () => {
    vi.spyOn(strategyRepo, "getAction").mockResolvedValue({
      id: "act-free",
      strategy_id: "strat-1",
      priority_order: 1,
      action_name: "Publish Organic Technical Guide",
      description: "Organic content distribution",
      target_module: "DISTRIBUTION",
      target_action: "POST_ARTICLE",
      execution_type: "AUTOMATIC",
      status: "PENDING",
      estimated_cost_inr: 0, // Zero cost compliant
      payload: {},
      linked_job_id: null,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(strategyRepo, "updateActionStatus").mockResolvedValue({} as any);
    vi.spyOn(jobManager, "submitJob").mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000002",
    } as any);

    const result = await strategyExecutor.executeAction("act-free", false);
    expect(result.status).toBe("COMPLETED");
    expect(result.job_id).toBe("00000000-0000-0000-0000-000000000002");
  });

  it("records expectation and analyzes variance in learning loop", async () => {
    vi.spyOn(strategyRepo, "createMemory").mockImplementation(async (m: any) => ({
      ...m,
      id: "mem-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const memory = await learningLoopEngine.recordExpectation({
      actionName: "Optimize Landing Page Headline",
      conditionsDescription: "100 visits, 0 signups",
      expectedOutcome: "Lift signup rate to 3%",
      confidence: "HIGH",
      isDemo: false,
    });

    expect(memory.id).toBe("mem-1");
    expect(memory.actual_outcome).toBeNull();

    vi.spyOn(strategyRepo, "getMemoryById").mockResolvedValue(memory);
    vi.spyOn(strategyRepo, "updateMemory").mockImplementation(async (id: string, patch: any) => ({
      ...memory,
      ...patch,
      id,
    }));

    const updated = await learningLoopEngine.recordOutcomeAndLearn(
      "mem-1",
      "Achieved 4% signup rate with 6 new signups",
      { visits: 150, signups: 6 }
    );

    expect(updated.actual_outcome).toBe("Achieved 4% signup rate with 6 new signups");
    expect(updated.variance_analysis).toContain("Positive/neutral alignment");
    expect(updated.learnings?.length).toBeGreaterThan(0);
  });
});
