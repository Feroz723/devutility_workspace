import {
  createCustomerIntervention,
  updateCustomerIntervention,
  getCustomerInterventionById,
  listCustomerInterventions,
  getCustomerProfileByCustomerId,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { checkCommunicationSafety } from "./safety";
import { sendCustomerSuccessEmail } from "./email";
import type { CustomerIntervention, InterventionType, InterventionUrgency } from "@/types/customer-success";

export interface ProposeInterventionInput {
  customer_id: string;
  product_id?: string | null;
  intervention_type: InterventionType;
  reason: string;
  recommended_action: string;
  urgency?: InterventionUrgency;
  channel?: "EMAIL" | "IN_APP" | "MANUAL";
  requires_approval?: boolean;
  evidence?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function proposeIntervention(
  input: ProposeInterventionInput
): Promise<CustomerIntervention> {
  const intervention = await createCustomerIntervention({
    customer_id: input.customer_id,
    product_id: input.product_id,
    intervention_type: input.intervention_type,
    reason: input.reason,
    recommended_action: input.recommended_action,
    urgency: input.urgency ?? "MEDIUM",
    channel: input.channel ?? "EMAIL",
    requires_approval: input.requires_approval !== undefined ? input.requires_approval : true,
    status: "PROPOSED",
    evidence: input.evidence ?? {},
    is_demo: input.is_demo,
  });

  await createAuditLog({
    event_type: "CUSTOMER_INTERVENTION_PROPOSED",
    entity_type: "customer_intervention",
    entity_id: intervention.id,
    actor: "customer_success_engine",
    details: {
      customer_id: input.customer_id,
      intervention_type: input.intervention_type,
      urgency: intervention.urgency,
      requires_approval: intervention.requires_approval,
    },
  });

  return intervention;
}

export async function approveCustomerIntervention(
  interventionId: string,
  approvedBy: string = "operator"
): Promise<CustomerIntervention | null> {
  const existing = await getCustomerInterventionById(interventionId);
  if (!existing || existing.status !== "PROPOSED") {
    return null;
  }

  const updated = await updateCustomerIntervention(interventionId, {
    status: "APPROVED",
    approved_at: new Date().toISOString(),
    approved_by: approvedBy,
  });

  if (updated) {
    await createAuditLog({
      event_type: "CUSTOMER_INTERVENTION_APPROVED",
      entity_type: "customer_intervention",
      entity_id: updated.id,
      actor: approvedBy,
      details: {
        customer_id: updated.customer_id,
        intervention_type: updated.intervention_type,
      },
    });
  }

  return updated;
}

export async function cancelCustomerIntervention(
  interventionId: string,
  reason: string = "Cancelled by operator"
): Promise<CustomerIntervention | null> {
  return updateCustomerIntervention(interventionId, {
    status: "CANCELLED",
    execution_result: { cancelled_reason: reason },
  });
}

export async function executeCustomerIntervention(
  interventionId: string
): Promise<{ success: boolean; status: string; reason?: string }> {
  const intervention = await getCustomerInterventionById(interventionId);
  if (!intervention) {
    return { success: false, status: "NOT_FOUND", reason: "Intervention not found" };
  }

  if (intervention.requires_approval && intervention.status !== "APPROVED") {
    return {
      success: false,
      status: "REQUIRES_APPROVAL",
      reason: "Intervention must be approved by an operator before execution.",
    };
  }

  // Safety check
  const safety = await checkCommunicationSafety(intervention.customer_id, {
    isUrgent: intervention.urgency === "CRITICAL",
  });

  if (!safety.allowed) {
    await updateCustomerIntervention(interventionId, {
      status: "FAILED",
      execution_result: { blocked_reason: safety.reason, code: safety.code },
    });
    return {
      success: false,
      status: "BLOCKED_SAFETY",
      reason: safety.reason,
    };
  }

  if (intervention.channel === "MANUAL") {
    await updateCustomerIntervention(interventionId, {
      status: "REQUIRES_MANUAL_ACTION",
      executed_at: new Date().toISOString(),
      execution_result: { message: "Queued in manual action center for human outreach." },
    });
    return { success: true, status: "REQUIRES_MANUAL_ACTION" };
  }

  // Handle email dispatch
  if (intervention.channel === "EMAIL") {
    const profile = await getCustomerProfileByCustomerId(intervention.customer_id);
    const emailResult = await sendCustomerSuccessEmail({
      to: (profile?.metadata?.email as string) || "customer@example.com",
      subject: `Support Update: ${intervention.reason}`,
      bodyText: intervention.recommended_action,
      customer_id: intervention.customer_id,
      intervention_id: intervention.id,
    });

    const newStatus = emailResult.status === "SENT" ? "SENT" : "REQUIRES_MANUAL_ACTION";
    await updateCustomerIntervention(interventionId, {
      status: newStatus,
      executed_at: new Date().toISOString(),
      execution_result: {
        provider: emailResult.provider,
        status: emailResult.status,
        reason: emailResult.reason,
      },
    });

    await createAuditLog({
      event_type: "CUSTOMER_INTERVENTION_EXECUTED",
      entity_type: "customer_intervention",
      entity_id: interventionId,
      actor: "customer_success_engine",
      details: {
        status: newStatus,
        channel: intervention.channel,
        result: emailResult,
      },
    });

    return {
      success: emailResult.success,
      status: newStatus,
      reason: emailResult.reason,
    };
  }

  // Default In-App intervention
  await updateCustomerIntervention(interventionId, {
    status: "COMPLETED",
    executed_at: new Date().toISOString(),
    execution_result: { message: "Displayed in-app guide to customer." },
  });

  return { success: true, status: "COMPLETED" };
}
