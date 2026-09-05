import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { cycleStateMachine } from "./cycle-state-machine";
import { safeModeEngine } from "../safe-mode";
import { autonomousIntelligenceRunner } from "@/intelligence/runner";
import { portfolioRankingEngine } from "@/intelligence/portfolio";
import { resourceAllocationEngine } from "@/intelligence/resource-allocation";
import { businessLearningEngine } from "@/intelligence/learning";
import { businessRiskDetector } from "@/intelligence/risk";
import type { ExecutionCycle } from "@/types/runtime";

export class WeeklyCycleRunner {
  /**
   * Executes the weekly strategic review cycle:
   * Portfolio ranking, stop rule evaluations, organizational learnings, and non-monetary resource rebalancing
   */
  async runWeeklyCycle(options?: { isDemo?: boolean; correlationId?: string }): Promise<ExecutionCycle> {
    const sysState = await operationsRepo.getSystemState().catch(() => null);
    if (sysState?.is_kill_switch_active) {
      throw new Error("Emergency Kill Switch is ACTIVE. Weekly review cycle aborted.");
    }
    if (sysState?.is_paused) {
      throw new Error("Global execution is PAUSED. Weekly review cycle aborted.");
    }

    const isDemo = options?.isDemo ?? false;
    const correlationId = options?.correlationId || `weekly_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const isDryRun = await safeModeEngine.isDryRunActive();
    const isSafeMode = await safeModeEngine.isSafeModeActive();

    const cycle = await runtimeRepo.createExecutionCycle({
      cycle_type: "WEEKLY",
      status: "RUNNING",
      correlation_id: correlationId,
      is_dry_run: isDryRun,
      is_safe_mode: isSafeMode,
      is_demo: isDemo,
      started_at: new Date().toISOString(),
    });

    const cycleStartTime = Date.now();
    const completedStages: string[] = [];
    const failedStages: string[] = [];
    const stageOutputs: Record<string, any> = {};

    const executeStage = async (stageName: string, actionFn: () => Promise<any>) => {
      const stageRecord = await runtimeRepo.createCycleStage({
        cycle_id: cycle.id,
        stage_name: stageName,
        phase_number: 10,
        sequence_order: completedStages.length + failedStages.length + 1,
        status: "RUNNING",
        started_at: new Date().toISOString(),
      });

      const start = Date.now();
      try {
        const out = await actionFn();
        const duration = Date.now() - start;

        await runtimeRepo.updateCycleStage(stageRecord.id, {
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          items_processed: 1,
          output: typeof out === "object" ? out : { result: out },
        });

        completedStages.push(stageName);
        stageOutputs[stageName] = out;
      } catch (err: any) {
        const duration = Date.now() - start;
        await runtimeRepo.updateCycleStage(stageRecord.id, {
          status: "FAILED",
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          error: err.message || String(err),
        });
        failedStages.push(stageName);
        stageOutputs[stageName] = { error: err.message };
      }
    };

    // Stage 1: Full Intelligence Refresh
    await executeStage("1_INTELLIGENCE_REFRESH", async () => {
      return autonomousIntelligenceRunner.runIntelligenceCycle(isDemo);
    });

    // Stage 2: Comprehensive Portfolio Ranking Matrix
    await executeStage("2_PORTFOLIO_RANKING", async () => {
      return portfolioRankingEngine.rankPortfolio(isDemo);
    });

    // Stage 3: Systemic Risk Audit
    await executeStage("3_SYSTEMIC_RISK_AUDIT", async () => {
      return businessRiskDetector.detectRisks(isDemo);
    });

    // Stage 4: Harvest Organizational Learnings
    await executeStage("4_HARVEST_LEARNINGS", async () => {
      return businessLearningEngine.harvestLearnings(isDemo);
    });

    // Stage 5: Resource Reallocation
    await executeStage("5_RESOURCE_REALLOCATION", async () => {
      return resourceAllocationEngine.rebalanceAllocations(
        { visitors: 0, leads: 0, signups: 0, checkouts: 0, paid_orders: 0, lead_conversion_percent: null, checkout_conversion_percent: null, payment_conversion_percent: null, refund_rate_percent: null, gross_revenue_inr: 0, net_revenue_inr: 0, average_order_value_inr: null, revenue_per_visitor_inr: null, revenue_per_customer_inr: null, has_sufficient_data: false },
        0,
        isDemo
      );
    });

    const totalDuration = Date.now() - cycleStartTime;
    const finalStatus = cycleStateMachine.evaluateFinalCycleStatus(completedStages, failedStages);

    const completedCycle = await runtimeRepo.updateExecutionCycle(cycle.id, {
      status: finalStatus,
      current_stage: null,
      stages_completed: completedStages,
      stages_failed: failedStages,
      completed_at: new Date().toISOString(),
      duration_ms: totalDuration,
      metrics: {
        total_stages: 5,
        completed_stages_count: completedStages.length,
        failed_stages_count: failedStages.length,
        stage_outputs: stageOutputs,
      },
    });

    await operationsRepo.updateSystemState({
      last_weekly_cycle_at: new Date().toISOString(),
      active_cycle: "IDLE",
    }).catch(() => null);

    return completedCycle!;
  }
}

export const weeklyCycleRunner = new WeeklyCycleRunner();
