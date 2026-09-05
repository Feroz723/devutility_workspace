import { runtimeRepo } from "@/database/repositories/runtime-repo";
import type { ExecutionCycle, CycleStatus, StageStatus } from "@/types/runtime";

const LEGAL_CYCLE_TRANSITIONS: Record<CycleStatus, CycleStatus[]> = {
  PLANNED: ["RUNNING", "CANCELLED", "PAUSED"],
  RUNNING: ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "PAUSED", "WAITING", "CANCELLED"],
  PAUSED: ["RUNNING", "CANCELLED"],
  WAITING: ["RUNNING", "CANCELLED", "FAILED"],
  COMPLETED: [],
  PARTIALLY_COMPLETED: [],
  FAILED: ["PLANNED"], // Allow manual restart
  CANCELLED: [],
};

export class CycleStateMachine {
  /**
   * Validate lifecycle transition
   */
  canTransition(currentStatus: CycleStatus, nextStatus: CycleStatus): boolean {
    const allowed = LEGAL_CYCLE_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  }

  /**
   * Transition cycle status
   */
  async transitionCycle(
    cycleId: string,
    nextStatus: CycleStatus,
    patch?: Partial<ExecutionCycle>
  ): Promise<ExecutionCycle> {
    const cycle = await runtimeRepo.getExecutionCycleById(cycleId);
    if (!cycle) {
      throw new Error(`Execution cycle ${cycleId} not found.`);
    }

    if (!this.canTransition(cycle.status, nextStatus)) {
      throw new Error(`Illegal cycle transition from ${cycle.status} to ${nextStatus}.`);
    }

    const updated = await runtimeRepo.updateExecutionCycle(cycleId, {
      ...patch,
      status: nextStatus,
      completed_at: ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"].includes(nextStatus)
        ? new Date().toISOString()
        : cycle.completed_at,
    });

    return updated!;
  }

  /**
   * Evaluates overall cycle outcome based on stage outcomes
   */
  evaluateFinalCycleStatus(stagesCompleted: string[], stagesFailed: string[]): CycleStatus {
    if (stagesFailed.length === 0) {
      return "COMPLETED";
    }
    if (stagesCompleted.length > 0 && stagesFailed.length > 0) {
      return "PARTIALLY_COMPLETED";
    }
    return "FAILED";
  }
}

export const cycleStateMachine = new CycleStateMachine();
