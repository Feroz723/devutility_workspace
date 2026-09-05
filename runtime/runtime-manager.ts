import { runtimeWorker } from "./worker";
import { runtimeScheduler } from "./scheduler";
import { runtimeConfigManager } from "./config";
import { dailyCycleRunner } from "./cycles/daily-cycle";
import { weeklyCycleRunner } from "./cycles/weekly-cycle";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { systemReadinessEngine } from "@/operations/readiness-engine";
import { resourceGovernor } from "./governor";
import type { RuntimeStatus, ExecutionCycle } from "@/types/runtime";

export class RuntimeManager {
  private isBooted: boolean = false;

  /**
   * Initializes the autonomous runtime environment
   */
  async boot(): Promise<void> {
    if (this.isBooted) return;

    // 1. Verify DB readiness
    const readiness = await systemReadinessEngine.evaluateReadiness();
    if (readiness.status === "SYSTEM_NOT_READY") {
      throw new Error(`Database connection failed during runtime boot: ${readiness.reasons.join(", ")}`);
    }

    // 2. Start worker and scheduler
    const config = await runtimeConfigManager.getConfig();
    if (config.worker_enabled) {
      await runtimeWorker.start();
    }
    if (config.scheduler_enabled) {
      await runtimeScheduler.start();
    }

    this.isBooted = true;
  }

  /**
   * Shutdown runtime cleanly
   */
  async shutdown(): Promise<void> {
    runtimeScheduler.stop();
    await runtimeWorker.stop();
    this.isBooted = false;
  }

  /**
   * Trigger on-demand Daily Business Cycle
   */
  async triggerDailyCycle(isDemo: boolean = false): Promise<ExecutionCycle> {
    return dailyCycleRunner.runDailyCycle({ isDemo });
  }

  /**
   * Trigger on-demand Weekly Strategic Review Cycle
   */
  async triggerWeeklyCycle(isDemo: boolean = false): Promise<ExecutionCycle> {
    return weeklyCycleRunner.runWeeklyCycle({ isDemo });
  }

  /**
   * Toggle Safe Mode
   */
  async setSafeMode(enabled: boolean): Promise<void> {
    await runtimeConfigManager.updateConfig({ safe_mode: enabled });
  }

  /**
   * Toggle Dry Run
   */
  async setDryRun(enabled: boolean): Promise<void> {
    await runtimeConfigManager.updateConfig({ dry_run: enabled });
  }

  /**
   * Pause Runtime
   */
  async pauseRuntime(reason: string = "Operator paused"): Promise<void> {
    await operationsRepo.updateSystemState({
      is_paused: true,
      pause_reason: reason,
    });
  }

  /**
   * Resume Runtime
   */
  async resumeRuntime(): Promise<void> {
    const state = await operationsRepo.getSystemState();
    if (state.is_kill_switch_active) {
      throw new Error("Cannot resume runtime while Emergency Kill Switch is engaged.");
    }
    await operationsRepo.updateSystemState({
      is_paused: false,
      pause_reason: null,
    });
  }

  /**
   * Get complete runtime status snapshot
   */
  async getStatus(): Promise<{
    status: RuntimeStatus;
    workerRunning: boolean;
    schedulerRunning: boolean;
    safeMode: boolean;
    dryRun: boolean;
    activeWorkersCount: number;
    activeJobsCount: number;
    queuedJobsCount: number;
    deadLetterJobsCount: number;
    lastDailyCycleAt: string | null;
    lastWeeklyCycleAt: string | null;
    systemReadiness: string;
    isPaused: boolean;
    isKillSwitchActive: boolean;
  }> {
    const config = await runtimeConfigManager.getConfig();
    const state = await operationsRepo.getSystemState();
    const deadLetters = await operationsRepo.listDeadLetterJobs({ limit: 1 });
    const queued = await operationsRepo.listJobs({ status: "QUEUED", limit: 1 });
    const activeWorkers = await runtimeRepo.listActiveWorkers();

    let status: RuntimeStatus = "RUNNING";
    if (state.is_kill_switch_active) status = "BLOCKED";
    else if (state.is_paused) status = "PAUSED";
    else if (config.safe_mode) status = "SAFE_MODE";
    else if (!runtimeWorker.isWorkerRunning()) status = "STOPPED";

    return {
      status,
      workerRunning: runtimeWorker.isWorkerRunning(),
      schedulerRunning: runtimeScheduler.isSchedulerRunning(),
      safeMode: config.safe_mode,
      dryRun: config.dry_run,
      activeWorkersCount: activeWorkers.length,
      activeJobsCount: resourceGovernor.getActiveGlobalCount(),
      queuedJobsCount: queued.total,
      deadLetterJobsCount: deadLetters.total,
      lastDailyCycleAt: state.last_daily_cycle_at || null,
      lastWeeklyCycleAt: state.last_weekly_cycle_at || null,
      systemReadiness: state.readiness_status,
      isPaused: state.is_paused,
      isKillSwitchActive: state.is_kill_switch_active,
    };
  }
}

export const runtimeManager = new RuntimeManager();
