import { describe, it, expect, vi, beforeEach } from "vitest";
import { dailyCycleRunner } from "@/runtime/cycles/daily-cycle";
import { weeklyCycleRunner } from "@/runtime/cycles/weekly-cycle";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { researchCycleAdapter } from "@/runtime/adapters/research-adapter";
import { validationCycleAdapter } from "@/runtime/adapters/validation-adapter";
import { experimentCycleAdapter } from "@/runtime/adapters/experiment-adapter";
import { productCycleAdapter } from "@/runtime/adapters/product-adapter";
import { distributionCycleAdapter } from "@/runtime/adapters/distribution-adapter";
import { salesCycleAdapter } from "@/runtime/adapters/sales-adapter";
import { customerSuccessCycleAdapter } from "@/runtime/adapters/customer-success-adapter";
import { intelligenceCycleAdapter } from "@/runtime/adapters/intelligence-adapter";
import { portfolioRankingEngine } from "@/intelligence/portfolio";
import { businessRiskDetector } from "@/intelligence/risk";
import { businessLearningEngine } from "@/intelligence/learning";
import { resourceAllocationEngine } from "@/intelligence/resource-allocation";
import { autonomousIntelligenceRunner } from "@/intelligence/runner";

describe("Phase 12 — Autonomous Execution Cycles", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(runtimeRepo, "createExecutionCycle").mockImplementation(async (cycle) => ({
      id: "cycle-123",
      cycle_type: cycle.cycle_type || "DAILY",
      status: "RUNNING",
      current_stage: null,
      stages_completed: [],
      stages_failed: [],
      stages_waiting: [],
      started_at: new Date().toISOString(),
      completed_at: null,
      duration_ms: null,
      correlation_id: "corr-123",
      is_dry_run: false,
      is_safe_mode: false,
      metrics: {},
      decisions_generated_count: 0,
      error_summary: null,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    vi.spyOn(runtimeRepo, "updateExecutionCycle").mockImplementation(async (id, patch) => ({
      id,
      cycle_type: "DAILY",
      status: patch.status || "COMPLETED",
      current_stage: patch.current_stage || null,
      stages_completed: (patch.stages_completed as string[]) || [],
      stages_failed: (patch.stages_failed as string[]) || [],
      stages_waiting: [],
      started_at: new Date().toISOString(),
      completed_at: patch.completed_at || new Date().toISOString(),
      duration_ms: patch.duration_ms || 100,
      correlation_id: "corr-123",
      is_dry_run: false,
      is_safe_mode: false,
      metrics: patch.metrics || {},
      decisions_generated_count: patch.decisions_generated_count || 0,
      error_summary: patch.error_summary || null,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    vi.spyOn(runtimeRepo, "createCycleStage").mockImplementation(async (stage) => ({
      id: "stage-123",
      cycle_id: stage.cycle_id || "cycle-123",
      stage_name: stage.stage_name || "stage",
      phase_number: stage.phase_number || 1,
      sequence_order: stage.sequence_order || 1,
      status: "COMPLETED",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 10,
      is_recoverable: true,
      items_processed: 0,
      error: null,
      output: {},
      created_at: new Date().toISOString(),
    }));

    vi.spyOn(runtimeRepo, "updateCycleStage").mockResolvedValue({} as any);
  });

  describe("Daily Autonomous Business Loop", () => {
    it("aborts execution if kill switch is active", async () => {
      vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
        is_kill_switch_active: true,
        is_paused: false,
      } as any);

      await expect(dailyCycleRunner.runDailyCycle()).rejects.toThrow("Emergency Kill Switch is ACTIVE");
    });

    it("runs complete daily cycle through all stages and marks completed", async () => {
      vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
        is_kill_switch_active: false,
        is_paused: false,
      } as any);

      vi.spyOn(researchCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 3,
        adapter_name: "ResearchAdapter",
        items_processed: 1,
        status: "SUCCESS",
        details: {},
      });

      vi.spyOn(validationCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 4,
        adapter_name: "ValidationAdapter",
        items_processed: 1,
        status: "SUCCESS",
        details: {},
      });

      vi.spyOn(experimentCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 5,
        adapter_name: "ExperimentAdapter",
        items_processed: 0,
        status: "NOTHING_ELIGIBLE",
        details: {},
      });

      vi.spyOn(productCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 6,
        adapter_name: "ProductAdapter",
        items_processed: 0,
        status: "NOTHING_ELIGIBLE",
        details: {},
      });

      vi.spyOn(distributionCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 7,
        adapter_name: "DistributionAdapter",
        items_processed: 0,
        status: "NOTHING_ELIGIBLE",
        details: {},
      });

      vi.spyOn(salesCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 8,
        adapter_name: "SalesAdapter",
        items_processed: 1,
        status: "SUCCESS",
        details: {},
      });

      vi.spyOn(customerSuccessCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 9,
        adapter_name: "CustomerSuccessAdapter",
        items_processed: 1,
        status: "SUCCESS",
        details: {},
      });

      vi.spyOn(intelligenceCycleAdapter, "execute").mockResolvedValue({
        success: true,
        phase: 10,
        adapter_name: "IntelligenceAdapter",
        items_processed: 2,
        status: "SUCCESS",
        details: {},
      });

      const { strategyEngine } = await import("@/strategy/strategy-engine");
      vi.spyOn(strategyEngine, "evaluateStrategy").mockResolvedValue({
        primary_strategy: { strategy_type: "ORGANIC_GROWTH", bottleneck_target: "EXPOSURE" },
        prioritized_actions: [{ title: "Action 1" }],
      } as any);

      const cycle = await dailyCycleRunner.runDailyCycle();

      expect(cycle.status).toBe("COMPLETED");
      expect(cycle.stages_completed.length).toBe(9);
      expect(cycle.stages_failed.length).toBe(0);
    });
  });

  describe("Weekly Strategic Review Loop", () => {
    it("runs 5-stage weekly strategic cycle", async () => {
      vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
        is_kill_switch_active: false,
        is_paused: false,
      } as any);

      vi.spyOn(autonomousIntelligenceRunner, "runIntelligenceCycle").mockResolvedValue({} as any);
      vi.spyOn(portfolioRankingEngine, "rankPortfolio").mockResolvedValue([]);
      vi.spyOn(businessRiskDetector, "detectRisks").mockResolvedValue([]);
      vi.spyOn(businessLearningEngine, "harvestLearnings").mockResolvedValue([]);
      vi.spyOn(resourceAllocationEngine, "rebalanceAllocations").mockResolvedValue([]);

      const cycle = await weeklyCycleRunner.runWeeklyCycle();

      expect(cycle.status).toBe("COMPLETED");
      expect(cycle.stages_completed.length).toBe(5);
    });
  });
});
