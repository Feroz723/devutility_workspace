import { describe, it, expect, vi, beforeEach } from "vitest";
import { jobManager } from "@/operations/job-manager";
import { dependencyGraphManager } from "@/operations/dependency-graph";
import { operationsRepo } from "@/database/repositories/operations-repo";
import type { OperationsJob } from "@/types/operations";

describe("Phase 11 — Global Job Orchestrator & DAG Dependencies", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Job Registration & Idempotency", () => {
    it("returns existing job if duplicate idempotency_key is submitted", async () => {
      const existingJob: OperationsJob = {
        id: "a0000000-0000-0000-0000-000000000001",
        name: "Research Cycle Job",
        module: "RESEARCH",
        action: "RUN_CYCLE",
        status: "SUCCEEDED",
        idempotency_key: "idem-key-abc",
        depends_on: [],
        blocks: [],
        priority: 50,
        retry_policy: { max_attempts: 3, backoff_base_ms: 1000, backoff_factor: 2, max_backoff_ms: 30000 },
        attempts: 1,
        max_attempts: 3,
        failure_classification: null,
        last_error: null,
        error_stack: null,
        timeout_seconds: 300,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        next_run_at: null,
        required_approval: false,
        approval_id: null,
        required_integration: null,
        resource_requirement: { time_weight: 1, compute_weight: 1 },
        safety_classification: "ZERO_COST_AUTO",
        payload: { query: "AI dev tools" },
        result: { findings: 10 },
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(operationsRepo, "getJobByIdempotencyKey").mockResolvedValue(existingJob);
      const createSpy = vi.spyOn(operationsRepo, "createJob");

      const registered = await jobManager.submitJob({
        name: "Research Cycle Job",
        module: "RESEARCH",
        action: "RUN_CYCLE",
        idempotency_key: "idem-key-abc",
        payload: { query: "AI dev tools" },
      });

      expect(registered.id).toBe(existingJob.id);
      expect(registered.status).toBe("SUCCEEDED");
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("registers new job with QUEUED status when idempotency key is novel", async () => {
      vi.spyOn(operationsRepo, "getJobByIdempotencyKey").mockResolvedValue(null);
      const createdJob: OperationsJob = {
        id: "a0000000-0000-0000-0000-000000000002",
        name: "Validation Cycle Job",
        module: "VALIDATION",
        action: "VALIDATE_OPP",
        status: "QUEUED",
        idempotency_key: "idem-key-xyz",
        depends_on: [],
        blocks: [],
        priority: 50,
        retry_policy: { max_attempts: 3, backoff_base_ms: 1000, backoff_factor: 2, max_backoff_ms: 30000 },
        attempts: 0,
        max_attempts: 3,
        failure_classification: null,
        last_error: null,
        error_stack: null,
        timeout_seconds: 300,
        started_at: null,
        completed_at: null,
        next_run_at: null,
        required_approval: false,
        approval_id: null,
        required_integration: null,
        resource_requirement: { time_weight: 1, compute_weight: 1 },
        safety_classification: "ZERO_COST_AUTO",
        payload: { opportunity_id: "opp-1" },
        result: null,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(operationsRepo, "createJob").mockResolvedValue(createdJob);
      const publishSpy = vi.spyOn(operationsRepo, "publishEvent").mockResolvedValue({} as any);

      const registered = await jobManager.submitJob({
        name: "Validation Cycle Job",
        module: "VALIDATION",
        action: "VALIDATE_OPP",
        idempotency_key: "idem-key-xyz",
        payload: { opportunity_id: "opp-1" },
      });

      expect(registered.id).toBe(createdJob.id);
      expect(registered.status).toBe("QUEUED");
      expect(registered.attempts).toBe(0);
    });
  });

  describe("DAG Dependency Graph & Prerequisite Enforcement", () => {
    it("detects circular dependencies in job graph", () => {
      const nodes = [
        { id: "job-a", depends_on: ["job-b"] },
        { id: "job-b", depends_on: ["job-c"] },
        { id: "job-c", depends_on: ["job-a"] },
      ];

      const result = dependencyGraphManager.detectCycles(nodes);
      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath?.length).toBeGreaterThan(0);
    });

    it("evaluates prerequisite readiness: marks WAITING when prerequisites are still running", async () => {
      vi.spyOn(operationsRepo, "getJobById").mockImplementation(async (id: string) => {
        if (id === "job-parent-1") {
          return { id: "job-parent-1", status: "SUCCEEDED" } as any;
        }
        if (id === "job-parent-2") {
          return { id: "job-parent-2", status: "RUNNING" } as any;
        }
        return null;
      });

      const childJob = {
        id: "job-child",
        depends_on: ["job-parent-1", "job-parent-2"],
      } as OperationsJob;

      const result = await dependencyGraphManager.checkDependencies(childJob);

      expect(result.satisfied).toBe(false);
      expect(result.status).toBe("WAITING");
      expect(result.pendingPrerequisites.length).toBe(1);
    });

    it("evaluates prerequisite readiness: marks BLOCKED when a prerequisite failed", async () => {
      vi.spyOn(operationsRepo, "getJobById").mockImplementation(async (id: string) => {
        if (id === "job-parent-1") {
          return { id: "job-parent-1", status: "FAILED" } as any;
        }
        return null;
      });

      const childJob = {
        id: "job-child",
        depends_on: ["job-parent-1"],
      } as OperationsJob;

      const result = await dependencyGraphManager.checkDependencies(childJob);

      expect(result.satisfied).toBe(false);
      expect(result.status).toBe("BLOCKED");
      expect(result.failedPrerequisites.length).toBe(1);
    });

    it("evaluates prerequisite readiness: marks READY when all prerequisites have SUCCEEDED", async () => {
      vi.spyOn(operationsRepo, "getJobById").mockImplementation(async (id: string) => {
        return { id, status: "SUCCEEDED" } as any;
      });

      const childJob = {
        id: "job-child",
        depends_on: ["job-parent-1", "job-parent-2"],
      } as OperationsJob;

      const result = await dependencyGraphManager.checkDependencies(childJob);

      expect(result.satisfied).toBe(true);
      expect(result.status).toBe("READY");
      expect(result.pendingPrerequisites).toHaveLength(0);
      expect(result.failedPrerequisites).toHaveLength(0);
    });
  });

  describe("Stale Job Recovery", () => {
    it("resets running jobs exceeding timeout back to PENDING or FAILED", async () => {
      const resetSpy = vi.spyOn(operationsRepo, "resetStaleRunningJobs").mockResolvedValue(2);

      const recoveredCount = await jobManager.recoverStaleJobs(30); // 30 min timeout

      expect(recoveredCount).toBe(2);
      expect(resetSpy).toHaveBeenCalledWith(30);
    });
  });
});
