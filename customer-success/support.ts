import {
  createCustomerSupportRequest,
  updateCustomerSupportRequest,
  getCustomerSupportRequestById,
  listCustomerSupportRequests,
  createCustomerSupportMessage,
  listCustomerSupportMessages,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type {
  CustomerSupportRequest,
  CustomerSupportMessage,
  SupportCategory,
  SupportSeverity,
  SupportStatus,
} from "@/types/customer-success";

export interface CreateTicketInput {
  customer_id: string;
  product_id?: string | null;
  subject: string;
  description: string;
  category?: SupportCategory;
  severity?: SupportSeverity;
  is_demo?: boolean;
}

export async function createSupportTicket(
  input: CreateTicketInput
): Promise<CustomerSupportRequest> {
  const ticketNumber = `TICK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const request = await createCustomerSupportRequest({
    ticket_number: ticketNumber,
    customer_id: input.customer_id,
    product_id: input.product_id,
    subject: input.subject,
    description: input.description,
    category: input.category || "USAGE",
    severity: input.severity || "MEDIUM",
    status: "OPEN",
    is_demo: input.is_demo,
  });

  // Create initial message
  await createCustomerSupportMessage({
    support_request_id: request.id,
    sender_type: "CUSTOMER",
    body: input.description,
  });

  await createAuditLog({
    event_type: "CUSTOMER_SUPPORT_CREATED",
    entity_type: "customer_support_request",
    entity_id: request.id,
    actor: "customer",
    details: {
      ticket_number: ticketNumber,
      customer_id: input.customer_id,
      category: request.category,
      severity: request.severity,
    },
  });

  return request;
}

export async function addTicketMessage(
  ticketId: string,
  senderType: "CUSTOMER" | "AGENT" | "AI_ASSISTANT" | "SYSTEM",
  body: string,
  senderName?: string
): Promise<CustomerSupportMessage> {
  const msg = await createCustomerSupportMessage({
    support_request_id: ticketId,
    sender_type: senderType,
    sender_name: senderName,
    body: body,
  });

  if (senderType === "AGENT" || senderType === "AI_ASSISTANT") {
    await updateCustomerSupportRequest(ticketId, {
      status: "WAITING_CUSTOMER",
    });
  }

  return msg;
}

export async function resolveSupportTicket(
  ticketId: string,
  resolution: string,
  resolvedBy: string = "operator"
): Promise<CustomerSupportRequest | null> {
  const ticket = await getCustomerSupportRequestById(ticketId);
  if (!ticket) return null;

  const createdAt = new Date(ticket.created_at).getTime();
  const now = Date.now();
  const resolutionTime = Math.max(0, Math.round((now - createdAt) / 1000));

  const updated = await updateCustomerSupportRequest(ticketId, {
    status: "RESOLVED",
    resolution: resolution,
    resolved_at: new Date().toISOString(),
    resolution_time_seconds: resolutionTime,
    assigned_to: resolvedBy,
  });

  if (updated) {
    await createAuditLog({
      event_type: "CUSTOMER_SUPPORT_RESOLVED",
      entity_type: "customer_support_request",
      entity_id: ticket.id,
      actor: resolvedBy,
      details: {
        ticket_number: ticket.ticket_number,
        resolution_time_seconds: resolutionTime,
      },
    });
  }

  return updated;
}
