import { describe, it, expect, vi, beforeEach } from "vitest";
import { RuntimeWorker } from "@/runtime/worker";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { jobManager } from "@/operations/job-manager";
import { resourceGovernor } from "@/runtime/governor";

describe("Phase 12 — Persistent Server-Side Worker Process", () => {
  let worker: RuntimeWorker;

  beforeEach(() => {
    vi.restoreAllMocks();
    worker = new RuntimeWorker();
  });

  describe("Lifecycle & Heartbeat", () => {
    it("registers worker instance on startup and sends heartbeat", async () => {
      const upsertSpy = vi.spyOn(runtimeRepo, "upsertRuntimeInstance").mockResolvedValue(undefined);
      vi.spyOn(operationsRepo, "resetStaleRunningJobs").mockResolvedValue(0);

      await worker.start();

      expect(worker.isWorkerRunning()).toBe(true);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: worker.getInstanceId(),
          status: "RUNNING",
          pid: process.pid,
        })
      );

      await worker.stop();
      expect(worker.isWorkerRunning()).toBe(false);
    });

    it("marks worker terminated on graceful stop", async () => {
      vi.spyOn(runtimeRepo, "upsertRuntimeInstance").mockResolvedValue(undefined);
      vi.spyOn(operationsRepo, "resetStaleRunningJobs").mockResolvedValue(0);
      const terminateSpy = vi.spyOn(runtimeRepo, "markWorkerTerminated").mockResolvedValue(undefined);

      await worker.start();
      await worker.stop();

      expect(terminateSpy).toHaveBeenCalledWith(worker.getInstanceId(), "STOPPED");
    });
  });

  describe("Job Polling & Atomic Processing", () => {
    it("aborts poll when kill switch is active", async () => {
      vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
        is_kill_switch_active: true,
        is_paused: false,
      } as any);

      const claimSpy = vi.spyOn(runtimeRepo, "atomicClaimNextJob");

      const processed = await worker.pollAndExecute();
      expect(processed).toBe(false);
      expect(claimSpy).not.toHaveBeenCalled();
    });

    it("claims and processes next available job with slot governance", async () => {
      vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
        is_kill_switch_active: false,
        is_paused: false,
      } as any);

      vi.spyOn(runtimeRepo, "atomicClaimNextJob").mockResolvedValue({
        id: "job-100",
        module: "RESEARCH",
        action: "CYCLE",
      } as any);

      const acquireSpy = vi.spyOn(resourceGovernor, "acquireSlot");
      const releaseSpy = vi.spyOn(resourceGovernor, "releaseSlot");
      const processSpy = vi.spyOn(jobManager, "processJob").mockResolvedValue({} as any);

      const processed = await worker.pollAndExecute();

      expect(processed).toBe(true);
      expect(acquireSpy).toHaveBeenCalledWith("RESEARCH");
      expect(processSpy).toHaveBeenCalledWith("job-100");
      expect(releaseSpy).toHaveBeenCalledWith("RESEARCH");
    });

    it("recovers stale running jobs on startup", async () => {
      vi.spyOn(operationsRepo, "resetStaleRunningJobs").mockResolvedValue(3);

      const recovered = await worker.recoverStaleJobs();
      expect(recovered).toBe(3);
    });
  });
});
