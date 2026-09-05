import { operationsRepo, type CreateJobInput } from "@/database/repositories/operations-repo";
import { retryEngine } from "./retry-engine";
import { dependencyGraphManager } from "./dependency-graph";
import { operationsEventBus } from "./event-bus";
import type { OperationsJob, JobStatus } from "@/types/operations";

export type JobHandler = (job: OperationsJob) => Promise<Record<string, any> | void>;

export class JobManager {
  private handlers: Map<string, JobHandler> = new Map();

  /**
   * Register an action handler for a module and action
   */
  registerHandler(module: string, action: string, handler: JobHandler): void {
    const key = `${module.toUpperCase()}:${action.toUpperCase()}`;
    this.handlers.set(key, handler);
  }

  /**
   * Submit or register a job into the orchestrator queue
   */
  async submitJob(input: CreateJobInput): Promise<OperationsJob> {
    const existing = await operationsRepo.getJobByIdempotencyKey(input.idempotency_key);
    if (existing) {
      return existing;
    }

    const job = await operationsRepo.createJob(input);

    await operationsEventBus.publish({
      event_type: "JOB_QUEUED",
      source_module: job.module,
      entity_type: "JOB",
      entity_id: job.id,
      payload: { name: job.name, action: job.action, priority: job.priority },
      is_demo: job.is_demo,
    });

    return job;
  }

  /**
   * Process a specific job through its lifecycle
   */
  async processJob(jobId: string): Promise<OperationsJob> {
    const job = await operationsRepo.getJobById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found.`);
    }

    // 1. Dependency evaluation
    const depCheck = await dependencyGraphManager.checkDependencies(job);
    if (!depCheck.satisfied) {
      const nextStatus: JobStatus = depCheck.status === "BLOCKED" ? "BLOCKED" : "WAITING";
      const updated = await operationsRepo.updateJobStatus(job.id, nextStatus, {
        last_error: `Prerequisites pending or failed: ${[...depCheck.pendingPrerequisites, ...depCheck.failedPrerequisites].join(", ")}`,
      });
      return updated!;
    }

    // 2. Mark running
    const startTime = Date.now();
    const currentAttempt = (job.attempts || 0) + 1;
    await operationsRepo.updateJobStatus(job.id, "RUNNING", {
      started_at: new Date().toISOString(),
      attempts: currentAttempt,
    });

    await operationsEventBus.publish({
      event_type: "JOB_STARTED",
      source_module: job.module,
      entity_type: "JOB",
      entity_id: job.id,
      payload: { attempt: currentAttempt },
      is_demo: job.is_demo,
    });

    // 3. Find registered action handler
    const handlerKey = `${job.module.toUpperCase()}:${job.action.toUpperCase()}`;
    const handler = this.handlers.get(handlerKey);

    try {
      let result: Record<string, any> | undefined;

      if (handler) {
        const handlerRes = await handler(job);
        if (handlerRes && typeof handlerRes === "object") {
          result = handlerRes;
        }
      }

      const durationMs = Date.now() - startTime;

      // Mark Succeeded
      const succeededJob = await operationsRepo.updateJobStatus(job.id, "SUCCEEDED", {
        completed_at: new Date().toISOString(),
        result: result ?? { status: "completed" },
      });

      // Log attempt history
      await operationsRepo.addJobHistory({
        job_id: job.id,
        attempt_number: currentAttempt,
        status: "SUCCEEDED",
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        output: result,
      });

      await operationsEventBus.publish({
        event_type: "JOB_SUCCEEDED",
        source_module: job.module,
        entity_type: "JOB",
        entity_id: job.id,
        payload: { duration_ms: durationMs },
        is_demo: job.is_demo,
      });

      return succeededJob!;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const failureOutcome = retryEngine.evaluateFailureOutcome(job, err);

      const failedJob = await operationsRepo.updateJobStatus(job.id, failureOutcome.nextStatus, {
        completed_at: new Date().toISOString(),
        last_error: err?.message || String(err),
        error_stack: err?.stack || undefined,
        failure_classification: failureOutcome.classification,
        next_run_at: failureOutcome.nextRunAt ?? undefined,
      });

      // Log attempt history
      await operationsRepo.addJobHistory({
        job_id: job.id,
        attempt_number: currentAttempt,
        status: failureOutcome.nextStatus,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        error: err?.message || String(err),
      });

      const eventType =
        failureOutcome.nextStatus === "DEAD_LETTER"
          ? "JOB_DEAD_LETTER"
          : failureOutcome.nextStatus === "RETRYING"
          ? "JOB_RETRYING"
          : "JOB_FAILED";

      await operationsEventBus.publish({
        event_type: eventType,
        source_module: job.module,
        entity_type: "JOB",
        entity_id: job.id,
        payload: {
          error: err?.message || String(err),
          classification: failureOutcome.classification,
          next_status: failureOutcome.nextStatus,
        },
        is_demo: job.is_demo,
      });

      return failedJob!;
    }
  }

  /**
   * Recover stale jobs that have been stuck in RUNNING state past the threshold
   */
  async recoverStaleJobs(thresholdMinutes: number = 10): Promise<number> {
    return operationsRepo.resetStaleRunningJobs(thresholdMinutes);
  }
}

export const jobManager = new JobManager();
