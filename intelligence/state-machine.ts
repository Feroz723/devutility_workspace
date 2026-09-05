import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { DecisionStatus, PortfolioDecision } from "@/types/intelligence";

const ALLOWED_TRANSITIONS: Record<DecisionStatus, DecisionStatus[]> = {
  PROPOSED: ["REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  REVIEW: ["APPROVED", "REJECTED", "PAUSED", "CANCELLED"],
  APPROVED: ["EXECUTING", "PAUSED", "CANCELLED"],
  EXECUTING: ["COMPLETED", "PAUSED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  PAUSED: ["REVIEW", "APPROVED", "EXECUTING", "CANCELLED"],
  CANCELLED: [],
};

export class DecisionStateMachine {
  /**
   * Validate whether a status transition is permitted
   */
  validateTransition(
    currentStatus: DecisionStatus,
    targetStatus: DecisionStatus,
    requiresApproval: boolean = true
  ): { isValid: boolean; error?: string } {
    if (currentStatus === targetStatus) {
      return { isValid: true };
    }

    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return {
        isValid: false,
        error: `Invalid decision transition from ${currentStatus} to ${targetStatus}. Allowed: ${allowed.join(", ") || "none"}`,
      };
    }

    // Safety guard: Cannot execute directly from PROPOSED or REVIEW if human approval is required
    if (targetStatus === "EXECUTING" && requiresApproval && currentStatus !== "APPROVED") {
      return {
        isValid: false,
        error: `Decision requires explicit human approval before execution. Current status is ${currentStatus}.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Execute state transition on a stored decision
   */
  async transition(
    decisionId: string,
    targetStatus: DecisionStatus,
    options?: {
      operator?: string;
      executionResult?: Record<string, any>;
      executionStatus?: string;
    }
  ): Promise<PortfolioDecision> {
    const decision = await intelligenceRepo.getDecisionById(decisionId);
    if (!decision) {
      throw new Error(`Decision with ID ${decisionId} not found.`);
    }

    const validation = this.validateTransition(decision.status, targetStatus, decision.requires_approval);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const updates: Partial<PortfolioDecision> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (targetStatus === "APPROVED") {
      updates.approved_by = options?.operator || "operator";
      updates.approved_at = new Date().toISOString();
    }

    if (options?.executionStatus) {
      updates.execution_status = options.executionStatus;
    }

    if (options?.executionResult) {
      updates.execution_result = options.executionResult;
    }

    const updated = await intelligenceRepo.updateDecision(decisionId, updates);
    if (!updated) {
      throw new Error(`Failed to update decision ${decisionId}.`);
    }

    return updated;
  }
}

export const decisionStateMachine = new DecisionStateMachine();
