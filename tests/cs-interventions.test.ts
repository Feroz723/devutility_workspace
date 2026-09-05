import { describe, it, expect, vi } from "vitest";
import {
  proposeIntervention,
  approveCustomerIntervention,
  executeCustomerIntervention,
} from "@/customer-success/interventions";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Interventions", () => {
  it("proposes intervention in PROPOSED status requiring approval", async () => {
    vi.spyOn(csRepo, "createCustomerIntervention").mockResolvedValueOnce({
      id: "int-1",
      customer_id: "c-1",
      intervention_type: "ONBOARDING_REMINDER",
      reason: "Customer stalled on step 2",
      recommended_action: "Send quickstart guide",
      status: "PROPOSED",
      requires_approval: true,
    } as any);

    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const result = await proposeIntervention({
      customer_id: "c-1",
      intervention_type: "ONBOARDING_REMINDER",
      reason: "Customer stalled on step 2",
      recommended_action: "Send quickstart guide",
    });

    expect(result.status).toBe("PROPOSED");
    expect(result.requires_approval).toBe(true);
  });

  it("approves intervention and records audit log", async () => {
    vi.spyOn(csRepo, "getCustomerInterventionById").mockResolvedValueOnce({
      id: "int-1",
      customer_id: "c-1",
      status: "PROPOSED",
    } as any);

    vi.spyOn(csRepo, "updateCustomerIntervention").mockResolvedValueOnce({
      id: "int-1",
      customer_id: "c-1",
      status: "APPROVED",
      approved_by: "operator",
    } as any);

    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const approved = await approveCustomerIntervention("int-1", "operator");
    expect(approved?.status).toBe("APPROVED");
    expect(approved?.approved_by).toBe("operator");
  });

  it("refuses to execute intervention if requires_approval and not approved", async () => {
    vi.spyOn(csRepo, "getCustomerInterventionById").mockResolvedValueOnce({
      id: "int-unapproved",
      customer_id: "c-1",
      status: "PROPOSED",
      requires_approval: true,
    } as any);

    const exec = await executeCustomerIntervention("int-unapproved");
    expect(exec.success).toBe(false);
    expect(exec.status).toBe("REQUIRES_APPROVAL");
  });
});
