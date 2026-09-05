import { strategyRepo } from "@/database/repositories/strategy-repo";
import { jobManager } from "@/operations/job-manager";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { StrategyAction, StrategyActionStatus } from "@/types/strategy";

export interface ActionExecutionResult {
  action_id: string;
  status: StrategyActionStatus;
  message: string;
  job_id?: string | null;
}

export class StrategyExecutor {
  /**
   * Execute or route a strategy action according to strict safety rules
   */
  async executeAction(
    actionId: string,
    isDemo: boolean = false
  ): Promise<ActionExecutionResult> {
    const action = await strategyRepo.getAction(actionId);
    if (!action) throw new Error(`Strategy action ${actionId} not found`);

    // Guard 1: Zero Spend Enforcement (₹0 limit)
    if (action.estimated_cost_inr > 0) {
      await strategyRepo.updateActionStatus(actionId, "WAITING_FOR_DATA");
      return {
        action_id: actionId,
        status: "WAITING_FOR_DATA",
        message: `Action requires spend of ₹${action.estimated_cost_inr}. Auto-execution blocked under ₹0 spend rule. Human approval required.`,
      };
    }

    // Guard 2: Execution Type checks
    if (action.execution_type === "REQUIRES_APPROVAL") {
      return {
        action_id: actionId,
        status: "PENDING",
        message: "Action requires manual/governance approval before execution.",
      };
    }

    if (action.execution_type === "WAITING") {
      await strategyRepo.updateActionStatus(actionId, "WAITING_FOR_DATA");
      return {
        action_id: actionId,
        status: "WAITING_FOR_DATA",
        message: "Action is waiting for observation window criteria to be met.",
      };
    }

    // Safe to enqueue or execute automatically
    await strategyRepo.updateActionStatus(actionId, "IN_PROGRESS");

    try {
      // Submit job to operations job manager
      const job = await jobManager.submitJob({
        name: `Strategy Action: ${action.action_name}`,
        module: action.target_module,
        action: action.target_action,
        priority: 10,
        payload: {
          strategy_action_id: action.id,
          strategy_id: action.strategy_id,
          ...action.payload,
        },
        idempotency_key: `strat_act_${action.id}`,
        is_demo: isDemo,
      });

      await strategyRepo.updateActionStatus(actionId, "COMPLETED", job.id);

      await createAuditLog({
        event_type: "STRATEGY_ACTION_EXECUTED",
        entity_type: "STRATEGY_ACTION",
        entity_id: action.id,
        actor: "strategy_executor",
        details: {
          action_name: action.action_name,
          job_id: job.id,
          cost_inr: action.estimated_cost_inr,
        },
      });

      return {
        action_id: actionId,
        status: "COMPLETED",
        message: `Strategy action executed successfully via job ${job.id}.`,
        job_id: job.id,
      };
    } catch (err: any) {
      await strategyRepo.updateActionStatus(actionId, "FAILED");
      return {
        action_id: actionId,
        status: "FAILED",
        message: `Execution failed: ${err.message}`,
      };
    }
  }
}

export const strategyExecutor = new StrategyExecutor();
