import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResourceGovernor } from "@/runtime/governor";
import { safeModeEngine } from "@/runtime/safe-mode";
import { runtimeConfigManager } from "@/runtime/config";

describe("Phase 12 — Resource Governor & Safe Mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Resource Governor (Concurrency Limits)", () => {
    it("permits job execution when slots are available", async () => {
      vi.spyOn(runtimeConfigManager, "getConfig").mockResolvedValue({
        id: "default",
        worker_enabled: true,
        scheduler_enabled: true,
        safe_mode: false,
        dry_run: false,
        polling_interval_ms: 5000,
        max_global_concurrency: 2,
        max_ai_concurrency: 1,
        max_research_concurrency: 1,
        daily_cycle_interval_hours: 24,
        weekly_cycle_interval_days: 7,
        stale_job_threshold_minutes: 15,
        default_retry_limit: 3,
        metadata: {},
        updated_at: new Date().toISOString(),
      });

      const governor = new ResourceGovernor();

      const check1 = await governor.checkExecutionAllowed("RESEARCH", "SEARCH");
      expect(check1.allowed).toBe(true);

      governor.acquireSlot("RESEARCH");
      expect(governor.getActiveGlobalCount()).toBe(1);
    });

    it("rejects execution when global slots are saturated", async () => {
      vi.spyOn(runtimeConfigManager, "getConfig").mockResolvedValue({
        id: "default",
        worker_enabled: true,
        scheduler_enabled: true,
        safe_mode: false,
        dry_run: false,
        polling_interval_ms: 5000,
        max_global_concurrency: 1,
        max_ai_concurrency: 1,
        max_research_concurrency: 1,
        daily_cycle_interval_hours: 24,
        weekly_cycle_interval_days: 7,
        stale_job_threshold_minutes: 15,
        default_retry_limit: 3,
        metadata: {},
        updated_at: new Date().toISOString(),
      });

      const governor = new ResourceGovernor();
      governor.acquireSlot("PORTFOLIO");

      const check2 = await governor.checkExecutionAllowed("PORTFOLIO", "RANK");
      expect(check2.allowed).toBe(false);
      expect(check2.reason).toContain("Global concurrency limit");
    });

    it("releases slots cleanly on job completion", async () => {
      vi.spyOn(runtimeConfigManager, "getConfig").mockResolvedValue({
        id: "default",
        worker_enabled: true,
        scheduler_enabled: true,
        safe_mode: false,
        dry_run: false,
        polling_interval_ms: 5000,
        max_global_concurrency: 1,
        max_ai_concurrency: 1,
        max_research_concurrency: 1,
        daily_cycle_interval_hours: 24,
        weekly_cycle_interval_days: 7,
        stale_job_threshold_minutes: 15,
        default_retry_limit: 3,
        metadata: {},
        updated_at: new Date().toISOString(),
      });

      const governor = new ResourceGovernor();

      governor.acquireSlot("PRODUCT");
      expect(governor.getActiveGlobalCount()).toBe(1);

      governor.releaseSlot("PRODUCT");
      expect(governor.getActiveGlobalCount()).toBe(0);

      const checkAfter = await governor.checkExecutionAllowed("PRODUCT", "BUILD");
      expect(checkAfter.allowed).toBe(true);
    });
  });

  describe("Safe Mode & Dry Run Engine", () => {
    it("allows internal queries and non-mutating operations in safe mode", async () => {
      vi.spyOn(runtimeConfigManager, "getConfig").mockResolvedValue({
        id: "default",
        worker_enabled: true,
        scheduler_enabled: true,
        safe_mode: true,
        dry_run: false,
        polling_interval_ms: 5000,
        max_global_concurrency: 3,
        max_ai_concurrency: 2,
        max_research_concurrency: 1,
        daily_cycle_interval_hours: 24,
        weekly_cycle_interval_days: 7,
        stale_job_threshold_minutes: 15,
        default_retry_limit: 3,
        metadata: {},
        updated_at: new Date().toISOString(),
      });

      const evalResult = await safeModeEngine.evaluateAction({
        name: "Aggregate BI Metrics",
        module: "INTELLIGENCE",
        isExternalMutation: false,
      });

      expect(evalResult.shouldExecute).toBe(true);
      expect(evalResult.label).toBe("REAL");
    });

    it("blocks external mutations when safe mode is engaged", async () => {
      vi.spyOn(runtimeConfigManager, "getConfig").mockResolvedValue({
        id: "default",
        worker_enabled: true,
        scheduler_enabled: true,
        safe_mode: true,
        dry_run: false,
        polling_interval_ms: 5000,
        max_global_concurrency: 3,
        max_ai_concurrency: 2,
        max_research_concurrency: 1,
        daily_cycle_interval_hours: 24,
        weekly_cycle_interval_days: 7,
        stale_job_threshold_minutes: 15,
        default_retry_limit: 3,
        metadata: {},
        updated_at: new Date().toISOString(),
      });

      const evalResult = await safeModeEngine.evaluateAction({
        name: "Publish Twitter Post",
        module: "DISTRIBUTION",
        isExternalMutation: true,
      });

      expect(evalResult.shouldExecute).toBe(false);
      expect(evalResult.label).toBe("SAFE_MODE_BLOCKED");
      expect(evalResult.reason).toContain("[SAFE_MODE]");
    });

    it("enforces dry-run simulation mode correctly", async () => {
      vi.spyOn(runtimeConfigManager, "getConfig").mockResolvedValue({
        id: "default",
        worker_enabled: true,
        scheduler_enabled: true,
        safe_mode: false,
        dry_run: true,
        polling_interval_ms: 5000,
        max_global_concurrency: 3,
        max_ai_concurrency: 2,
        max_research_concurrency: 1,
        daily_cycle_interval_hours: 24,
        weekly_cycle_interval_days: 7,
        stale_job_threshold_minutes: 15,
        default_retry_limit: 3,
        metadata: {},
        updated_at: new Date().toISOString(),
      });

      const isDryRun = await safeModeEngine.isDryRunActive();
      expect(isDryRun).toBe(true);

      const evalResult = await safeModeEngine.evaluateAction({
        name: "Publish Offer",
        module: "SALES",
      });

      expect(evalResult.shouldExecute).toBe(false);
      expect(evalResult.isDryRun).toBe(true);
      expect(evalResult.label).toBe("DRY_RUN");
    });
  });
});
