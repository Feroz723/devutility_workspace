import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { jobManager } from "@/operations/job-manager";
import { runtimeConfigManager } from "./config";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { dailyCycleRunner } from "./cycles/daily-cycle";
import { weeklyCycleRunner } from "./cycles/weekly-cycle";
import type { ScheduledJob } from "@/types/runtime";

export class RuntimeScheduler {
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;

  /**
   * Start the persistent scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Ensure baseline recurring schedules exist in DB
    await this.ensureBaselineSchedules();

    // 2. Start polling loop (checks every 10s)
    this.scheduleNextPoll();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;

    this.pollTimer = setTimeout(async () => {
      try {
        await this.pollDueSchedules();
      } catch {
        // Safe continuation
      } finally {
        this.scheduleNextPoll();
      }
    }, 10000);
  }

  /**
   * Poll and execute due schedules
   */
  async pollDueSchedules(): Promise<number> {
    const config = await runtimeConfigManager.getConfig();
    if (!config.scheduler_enabled) return 0;

    // Do not dispatch new work if system is paused or kill switch active
    const sysState = await operationsRepo.getSystemState().catch(() => null);
    if (sysState?.is_kill_switch_active || sysState?.is_paused) {
      return 0;
    }

    const dueJobs = await runtimeRepo.claimDueScheduledJobs(new Date().toISOString(), 10);
    let dispatched = 0;

    for (const schedule of dueJobs) {
      try {
        await this.dispatchScheduledJob(schedule);
        dispatched++;

        // Calculate next run time
        const nextRun = this.calculateNextRunAt(schedule);
        await runtimeRepo.updateScheduledJob(schedule.id, {
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun.toISOString(),
          total_runs: schedule.total_runs + 1,
          status: schedule.schedule_type === "ONE_TIME" ? "COMPLETED" : "ACTIVE",
        });
      } catch {
        // Individual schedule failure logged safely
      }
    }

    return dispatched;
  }

  /**
   * Dispatches a scheduled job into execution
   */
  async dispatchScheduledJob(schedule: ScheduledJob): Promise<void> {
    if (schedule.job_type === "DAILY_CYCLE") {
      // Trigger daily cycle directly
      await dailyCycleRunner.runDailyCycle();
    } else if (schedule.job_type === "WEEKLY_CYCLE") {
      // Trigger weekly review directly
      await weeklyCycleRunner.runWeeklyCycle();
    } else {
      // Submit as regular operations job in queue
      await jobManager.submitJob({
        name: schedule.name,
        module: schedule.target_module,
        action: schedule.target_action,
        idempotency_key: `sched_${schedule.id}_${Date.now()}`,
        payload: schedule.payload,
        priority: 50,
      });
    }
  }

  /**
   * Calculate next run time based on schedule type and interval
   */
  calculateNextRunAt(schedule: ScheduledJob): Date {
    const intervalSec = schedule.interval_seconds || 3600;
    return new Date(Date.now() + intervalSec * 1000);
  }

  /**
   * Ensures baseline recurring business schedules exist in the database
   */
  async ensureBaselineSchedules(): Promise<void> {
    const existing = await runtimeRepo.listScheduledJobs({ limit: 50 });

    const hasDaily = existing.some((s) => s.job_type === "DAILY_CYCLE");
    if (!hasDaily) {
      await runtimeRepo.createScheduledJob({
        name: "Autonomous Daily Business Cycle",
        job_type: "DAILY_CYCLE",
        target_module: "RUNTIME",
        target_action: "RUN_DAILY_CYCLE",
        schedule_type: "INTERVAL",
        interval_seconds: 86400, // 24 hours
        next_run_at: new Date(Date.now() + 60000).toISOString(), // First run in 1 minute
      });
    }

    const hasWeekly = existing.some((s) => s.job_type === "WEEKLY_CYCLE");
    if (!hasWeekly) {
      await runtimeRepo.createScheduledJob({
        name: "Autonomous Weekly Strategic Review",
        job_type: "WEEKLY_CYCLE",
        target_module: "RUNTIME",
        target_action: "RUN_WEEKLY_CYCLE",
        schedule_type: "INTERVAL",
        interval_seconds: 604800, // 7 days
        next_run_at: new Date(Date.now() + 86400 * 1000).toISOString(), // Run tomorrow
      });
    }
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

export const runtimeScheduler = new RuntimeScheduler();
