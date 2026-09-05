import { operationsRepo } from "@/database/repositories/operations-repo";
import { approveApproval, rejectApproval } from "@/database/repositories/approval-repo";
import { decisionStateMachine } from "@/intelligence/state-machine";
import { updateCustomerIntervention } from "@/database/repositories/customer-success-repo";
import { operationsEventBus } from "./event-bus";
import type { UnifiedApprovalItem } from "@/types/operations";

export class ApprovalAggregator {
  /**
   * List all pending approval requests aggregated across all subsystems
   */
  async getPendingApprovals(): Promise<UnifiedApprovalItem[]> {
    return operationsRepo.listUnifiedApprovals();
  }

  /**
   * Approve a pending action request
   */
  async approveAction(id: string, operator: string = "operator"): Promise<void> {
    const approvals = await this.getPendingApprovals();
    const item = approvals.find((a) => a.id === id);
    if (!item) {
      throw new Error(`Approval item with ID ${id} not found.`);
    }

    if (item.originating_module === "BUSINESS_INTELLIGENCE") {
      await decisionStateMachine.transition(id, "APPROVED", { operator });
    } else if (item.originating_module === "CUSTOMER_SUCCESS") {
      await updateCustomerIntervention(id, {
        status: "APPROVED",
        approved_by: operator,
        approved_at: new Date().toISOString(),
      });
    } else {
      await approveApproval(id, operator);
    }

    await operationsEventBus.publish({
      event_type: "APPROVAL_APPROVED",
      source_module: item.originating_module,
      entity_type: item.entity_type,
      entity_id: id,
      payload: {
        action_type: item.action_type,
        approved_by: operator,
        estimated_cost_inr: item.estimated_cost_inr,
      },
    });
  }

  /**
   * Reject a pending action request
   */
  async rejectAction(id: string, operator: string = "operator", reason: string = "Operator rejected"): Promise<void> {
    const approvals = await this.getPendingApprovals();
    const item = approvals.find((a) => a.id === id);
    if (!item) {
      throw new Error(`Approval item with ID ${id} not found.`);
    }

    if (item.originating_module === "BUSINESS_INTELLIGENCE") {
      await decisionStateMachine.transition(id, "REJECTED", { operator });
    } else if (item.originating_module === "CUSTOMER_SUCCESS") {
      await updateCustomerIntervention(id, {
        status: "CANCELLED",
      });
    } else {
      await rejectApproval(id, operator, reason);
    }

    await operationsEventBus.publish({
      event_type: "APPROVAL_REJECTED",
      source_module: item.originating_module,
      entity_type: item.entity_type,
      entity_id: id,
      payload: {
        action_type: item.action_type,
        rejected_by: operator,
        reason,
      },
    });
  }
}

export const approvalAggregator = new ApprovalAggregator();
