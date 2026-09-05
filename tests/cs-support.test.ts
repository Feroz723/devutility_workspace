import { describe, it, expect, vi } from "vitest";
import { createSupportTicket, resolveSupportTicket } from "@/customer-success/support";
import { triageSupportTicketWithAI } from "@/customer-success/ai-support";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Support & AI Triage", () => {
  it("creates support ticket and logs audit event", async () => {
    vi.spyOn(csRepo, "createCustomerSupportRequest").mockResolvedValueOnce({
      id: "tick-1",
      ticket_number: "TICK-TEST-1234",
      customer_id: "c-1",
      subject: "Cannot access downloads",
      description: "Getting 403 on PDF link",
      category: "ACCESS",
      severity: "HIGH",
      status: "OPEN",
    } as any);

    vi.spyOn(csRepo, "createCustomerSupportMessage").mockResolvedValueOnce({} as any);
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const ticket = await createSupportTicket({
      customer_id: "c-1",
      subject: "Cannot access downloads",
      description: "Getting 403 on PDF link",
    });

    expect(ticket.id).toBe("tick-1");
    expect(ticket.category).toBe("ACCESS");
  });

  it("triages payment/refund tickets with strict financial safety flag (read-only draft)", async () => {
    vi.spyOn(csRepo, "getCustomerSupportRequestById").mockResolvedValueOnce({
      id: "tick-billing",
      subject: "Request refund for recent charge",
      description: "I want my money back please",
      category: "USAGE",
      status: "OPEN",
    } as any);

    vi.spyOn(csRepo, "updateCustomerSupportRequest").mockResolvedValueOnce({} as any);

    const result = await triageSupportTicketWithAI("tick-billing");
    expect(result?.suggested_category).toBe("PAYMENT");
    expect(result?.suggested_severity).toBe("HIGH");
    expect(result?.safety_flags).toContain(
      "FINANCIAL_REQUEST: AI cannot approve or process refunds. Human agent review required."
    );
  });

  it("resolves support ticket and calculates resolution time", async () => {
    const createdAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    vi.spyOn(csRepo, "getCustomerSupportRequestById").mockResolvedValueOnce({
      id: "tick-1",
      ticket_number: "TICK-1",
      created_at: createdAt,
    } as any);

    const updateSpy = vi.spyOn(csRepo, "updateCustomerSupportRequest").mockResolvedValueOnce({
      id: "tick-1",
      status: "RESOLVED",
      resolution: "Access key regenerated",
      resolution_time_seconds: 3600,
    } as any);

    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const resolved = await resolveSupportTicket("tick-1", "Access key regenerated", "operator");
    expect(updateSpy).toHaveBeenCalledWith("tick-1", expect.objectContaining({
      status: "RESOLVED",
      resolution: "Access key regenerated",
      assigned_to: "operator",
    }));
    expect(resolved?.status).toBe("RESOLVED");
  });
});
