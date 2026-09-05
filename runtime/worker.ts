import os from "os";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { runtimeConfigManager } from "./config";
import { resourceGovernor } from "./governor";
import { jobManager } from "@/operations/job-manager";
import { runtimeNotificationService } from "./notifications/notification-service";
import type { RuntimeInstance, RuntimeStatus } from "@/types/runtime";

export class RuntimeWorker {
  private instanceId: string;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private processedCount: number = 0;
  private failedCount: number = 0;

  constructor() {
    this.instanceId = `worker_${os.hostname()}_${process.pid}_${Math.random().toString(36).substring(7)}`;
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Starts the continuous persistent worker process
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Register instance in runtime_instances
    const instance: RuntimeInstance = {
      id: this.instanceId,
      hostname: os.hostname(),
      pid: process.pid,
      status: "RUNNING",
      started_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      active_jobs_count: 0,
      processed_jobs_count: 0,
      failed_jobs_count: 0,
      metadata: {
        platform: os.platform(),
        arch: os.arch(),
        node_version: process.version,
      },
    };

    await runtimeRepo.upsertRuntimeInstance(instance).catch(() => null);

    // 2. Recover stale jobs on startup
    await this.recoverStaleJobs();

    // 3. Start Heartbeat Timer (every 15s)
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.sendHeartbeat().catch(() => null);
    }, 15000);

    // 4. Start Polling Loop
    this.scheduleNextPoll();
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    await runtimeRepo.markWorkerTerminated(this.instanceId, "STOPPED").catch(() => null);
  }

  /**
   * Recover stale jobs that exceeded timeout
   */
  async recoverStaleJobs(): Promise<number> {
    const config = await runtimeConfigManager.getConfig();
    const thresholdMins = config.stale_job_threshold_minutes || 15;
    const recovered = await operationsRepo.resetStaleRunningJobs(thresholdMins).catch(() => 0);
    if (recovered > 0) {
      await runtimeNotificationService.notify({
        eventType: "STALE_JOBS_RECOVERED",
        severity: "WARNING",
        title: "Stale Jobs Recovered",
        message: `Worker startup detected and recovered ${recovered} stale job(s) stuck in RUNNING status.`,
        sourceModule: "WORKER",
      }).catch(() => null);
    }
    return recovered;
  }

  private async sendHeartbeat(): Promise<void> {
    await runtimeRepo.updateWorkerHeartbeat(
      this.instanceId,
      resourceGovernor.getActiveGlobalCount(),
      this.processedCount,
      this.failedCount
    );
    await resourceGovernor.recordUsageTelemetry();
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;

    this.pollTimer = setTimeout(async () => {
      try {
        await this.pollAndExecute();
      } catch {
        // Safe loop continuation
      } finally {
        this.scheduleNextPoll();
      }
    }, 2000);
  }

  /**
   * Single poll & execute iteration
   */
  async pollAndExecute(): Promise<boolean> {
    const config = await runtimeConfigManager.getConfig();
    if (!config.worker_enabled) return false;

    // Check system state (kill switch or global pause)
    const sysState = await operationsRepo.getSystemState().catch(() => null);
    if (sysState?.is_kill_switch_active || sysState?.is_paused) {
      return false;
    }

    // Check global concurrency
    const govCheck = await resourceGovernor.checkExecutionAllowed("GENERAL", "POLL");
    if (!govCheck.allowed) {
      return false;
    }

    // Atomically claim next job
    const job = await runtimeRepo.atomicClaimNextJob(this.instanceId);
    if (!job) return false;

    // Execute job under resource governance
    resourceGovernor.acquireSlot(job.module);

    try {
      await jobManager.processJob(job.id);
      this.processedCount++;
    } catch {
      this.failedCount++;
    } finally {
      resourceGovernor.releaseSlot(job.module);
    }

    return true;
  }

  isWorkerRunning(): boolean {
    return this.isRunning;
  }
}

export const runtimeWorker = new RuntimeWorker();
