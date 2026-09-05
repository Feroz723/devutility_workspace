import crypto from "crypto";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { cycleStateMachine } from "./cycle-state-machine";
import { safeModeEngine } from "../safe-mode";
import { researchCycleAdapter } from "../adapters/research-adapter";
import { validationCycleAdapter } from "../adapters/validation-adapter";
import { experimentCycleAdapter } from "../adapters/experiment-adapter";
import { productCycleAdapter } from "../adapters/product-adapter";
import { distributionCycleAdapter } from "../adapters/distribution-adapter";
import { salesCycleAdapter } from "../adapters/sales-adapter";
import { customerSuccessCycleAdapter } from "../adapters/customer-success-adapter";
import { intelligenceCycleAdapter } from "../adapters/intelligence-adapter";
import type { ExecutionCycle, CrossPhaseAdapterResult } from "@/types/runtime";

export class DailyCycleRunner {
  /**
   * Executes the complete autonomous 16-stage daily business cycle
   */
  async runDailyCycle(options?: { isDemo?: boolean; correlationId?: string }): Promise<ExecutionCycle> {
    const sysState = await operationsRepo.getSystemState().catch(() => null);
    if (sysState?.is_kill_switch_active) {
      throw new Error("Emergency Kill Switch is ACTIVE. Daily cycle aborted.");
    }
    if (sysState?.is_paused) {
      throw new Error("Global execution is PAUSED. Daily cycle aborted.");
    }

    const isDemo = options?.isDemo ?? false;
    const correlationId = options?.correlationId || `daily_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const isDryRun = await safeModeEngine.isDryRunActive();
    const isSafeMode = await safeModeEngine.isSafeModeActive();

    // 1. Initialize Execution Cycle
    const cycle = await runtimeRepo.createExecutionCycle({
      cycle_type: "DAILY",
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
    let decisionsCount = 0;

    // Helper to execute a single cycle stage safely
    const executeStage = async (
      stageName: string,
      phaseNumber: number,
      sequenceOrder: number,
      actionFn: () => Promise<CrossPhaseAdapterResult>
    ) => {
      const stageRecord = await runtimeRepo.createCycleStage({
        cycle_id: cycle.id,
        stage_name: stageName,
        phase_number: phaseNumber,
        sequence_order: sequenceOrder,
        status: "RUNNING",
        started_at: new Date().toISOString(),
      });

      await runtimeRepo.updateExecutionCycle(cycle.id, { current_stage: stageName });

      const stageStart = Date.now();
      try {
        const result = await actionFn();
        const duration = Date.now() - stageStart;

        await runtimeRepo.updateCycleStage(stageRecord.id, {
          status: result.success ? "COMPLETED" : "FAILED",
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          items_processed: result.items_processed,
          output: result.details,
          error: result.error || null,
        });

        if (result.success) {
          completedStages.push(stageName);
        } else {
          failedStages.push(stageName);
        }

        stageOutputs[stageName] = result;
        if (result.details?.decisions_proposed) {
          decisionsCount += Number(result.details.decisions_proposed) || 0;
        }
      } catch (err: any) {
        const duration = Date.now() - stageStart;
        await runtimeRepo.updateCycleStage(stageRecord.id, {
          status: "FAILED",
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          error: err.message || String(err),
        });
        failedStages.push(stageName);
        stageOutputs[stageName] = { success: false, error: err.message };
      }
    };

    // --- STAGE 1: Opportunity Research Discovery ---
    await executeStage("1_RESEARCH_DISCOVERY", 3, 1, async () => {
      return researchCycleAdapter.execute({ isDemo });
    });

    // --- STAGE 2: Opportunity Validation & Scoring ---
    await executeStage("2_VALIDATION_SCORING", 4, 2, async () => {
      return validationCycleAdapter.execute({ isDemo });
    });

    // --- STAGE 3: Experiment Advancement & Analysis ---
    await executeStage("3_EXPERIMENT_ADVANCEMENT", 5, 3, async () => {
      return experimentCycleAdapter.execute({ isDemo });
    });

    // --- STAGE 4: Product Build Pipeline ---
    await executeStage("4_PRODUCT_BUILD", 6, 4, async () => {
      return productCycleAdapter.execute({ isDemo });
    });

    // --- STAGE 5: Zero-Cost Distribution Campaign Dispatch ---
    await executeStage("5_DISTRIBUTION_DISPATCH", 7, 5, async () => {
      return distributionCycleAdapter.execute({ isDemo });
    });

    // --- STAGE 6: Sales Operations & Delivery Retries ---
    await executeStage("6_SALES_DELIVERY_CYCLE", 8, 6, async () => {
      return salesCycleAdapter.execute();
    });

    // --- STAGE 7: Customer Success Health & Interventions ---
    await executeStage("7_CUSTOMER_SUCCESS_SIGNALS", 9, 7, async () => {
      return customerSuccessCycleAdapter.execute({ isDemo });
    });

    // --- STAGE 8: Business Intelligence Snapshot & Portfolio Decisions ---
    await executeStage("8_BUSINESS_INTELLIGENCE", 10, 8, async () => {
      return intelligenceCycleAdapter.execute({ isDemo });
    });

    // --- STAGE 9: Strategy Governor Intelligence & Next Actions ---
    await executeStage("9_STRATEGY_GOVERNOR", 13, 9, async (): Promise<CrossPhaseAdapterResult> => {
      try {
        const { strategyEngine } = await import("@/strategy/strategy-engine");
        const evalRes = await strategyEngine.evaluateStrategy({
          isDemo,
          reason: "Daily autonomous cycle strategic intelligence",
        });
        return {
          success: true,
          phase: 13,
          adapter_name: "StrategyGovernorAdapter",
          items_processed: evalRes.prioritized_actions.length,
          status: "SUCCESS",
          details: {
            strategy: evalRes.primary_strategy.strategy_type,
            actions_count: evalRes.prioritized_actions.length,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          phase: 13,
          adapter_name: "StrategyGovernorAdapter",
          items_processed: 0,
          status: "FAILED",
          details: { error: err.message },
          error: err.message,
        };
      }
    });

    // 3. Finalize Cycle Status
    const totalDuration = Date.now() - cycleStartTime;
    const finalStatus = cycleStateMachine.evaluateFinalCycleStatus(completedStages, failedStages);

    const completedCycle = await runtimeRepo.updateExecutionCycle(cycle.id, {
      status: finalStatus,
      current_stage: null,
      stages_completed: completedStages,
      stages_failed: failedStages,
      completed_at: new Date().toISOString(),
      duration_ms: totalDuration,
      decisions_generated_count: decisionsCount,
      metrics: {
        total_stages: 9,
        completed_stages_count: completedStages.length,
        failed_stages_count: failedStages.length,
        stage_outputs: stageOutputs,
      },
    });

    // Update system state with last completed daily cycle timestamp
    await operationsRepo.updateSystemState({
      last_daily_cycle_at: new Date().toISOString(),
      active_cycle: "IDLE",
    }).catch(() => null);

    return completedCycle!;
  }
}

export const dailyCycleRunner = new DailyCycleRunner();
