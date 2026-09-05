import { describe, it, expect, vi, beforeEach } from "vitest";
import { runtimeScheduler } from "@/runtime/scheduler";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { dailyCycleRunner } from "@/runtime/cycles/daily-cycle";
import { weeklyCycleRunner } from "@/runtime/cycles/weekly-cycle";
import { jobManager } from "@/operations/job-manager";

describe("Phase 12 — Database-Backed Runtime Scheduler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Next Run At Calculation", () => {
    it("calculates next run at based on interval_seconds", () => {
      const now = Date.now();
      const nextRun = runtimeScheduler.calculateNextRunAt({
        id: "sched-1",
        interval_seconds: 3600,
      } as any);

      const diffSec = Math.round((nextRun.getTime() - now) / 1000);
      expect(diffSec).toBeGreaterThanOrEqual(3599);
      expect(diffSec).toBeLessThanOrEqual(3601);
    });
  });

  describe("Baseline Schedules Seeding", () => {
    it("creates baseline daily and weekly schedules if missing", async () => {
      vi.spyOn(runtimeRepo, "listScheduledJobs").mockResolvedValue([]);
      const createSpy = vi.spyOn(runtimeRepo, "createScheduledJob").mockResolvedValue({} as any);

      await runtimeScheduler.ensureBaselineSchedules();

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ job_type: "DAILY_CYCLE" })
      );
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ job_type: "WEEKLY_CYCLE" })
      );
    });

    it("does not recreate schedules if already present", async () => {
      vi.spyOn(runtimeRepo, "listScheduledJobs").mockResolvedValue([
        { id: "1", job_type: "DAILY_CYCLE" } as any,
        { id: "2", job_type: "WEEKLY_CYCLE" } as any,
      ]);
      const createSpy = vi.spyOn(runtimeRepo, "createScheduledJob").mockResolvedValue({} as any);

      await runtimeScheduler.ensureBaselineSchedules();

      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe("Polling and Job Dispatching", () => {
    it("skips execution if kill switch or global pause is active", async () => {
      vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
        is_kill_switch_active: true,
        is_paused: false,
      } as any);

      const claimSpy = vi.spyOn(runtimeRepo, "claimDueScheduledJobs");

      const count = await runtimeScheduler.pollDueSchedules();
      expect(count).toBe(0);
      expect(claimSpy).not.toHaveBeenCalled();
    });

    it("dispatches DAILY_CYCLE directly to dailyCycleRunner", async () => {
      vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
        is_kill_switch_active: false,
        is_paused: false,
      } as any);

      vi.spyOn(runtimeRepo, "claimDueScheduledJobs").mockResolvedValue([
        {
          id: "sched-daily",
          name: "Daily Business Cycle",
          job_type: "DAILY_CYCLE",
          target_module: "RUNTIME",
          target_action: "RUN_DAILY_CYCLE",
          schedule_type: "INTERVAL",
          interval_seconds: 86400,
          total_runs: 0,
          payload: {},
        } as any,
      ]);

      const dailySpy = vi.spyOn(dailyCycleRunner, "runDailyCycle").mockResolvedValue({
        id: "cycle-1",
        status: "COMPLETED",
      } as any);

      vi.spyOn(runtimeRepo, "updateScheduledJob").mockResolvedValue({} as any);

      const count = await runtimeScheduler.pollDueSchedules();

      expect(count).toBe(1);
      expect(dailySpy).toHaveBeenCalled();
    });

    it("submits general scheduled jobs to jobManager queue", async () => {
      const submitSpy = vi.spyOn(jobManager, "submitJob").mockResolvedValue({ id: "job-1" } as any);

      await runtimeScheduler.dispatchScheduledJob({
        id: "sched-custom",
        name: "Custom Data Sync",
        job_type: "DATA_SYNC",
        target_module: "INTELLIGENCE",
        target_action: "SYNC",
        payload: { scope: "metrics" },
      } as any);

      expect(submitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Custom Data Sync",
          module: "INTELLIGENCE",
          action: "SYNC",
        })
      );
    });
  });
});
