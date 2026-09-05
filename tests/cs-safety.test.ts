import { describe, it, expect, vi } from "vitest";
import { checkCommunicationSafety } from "@/customer-success/safety";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Communication Safety", () => {
  it("blocks communication if customer is unsubscribed", async () => {
    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValueOnce({
      id: "p-1",
      customer_id: "c-unsub",
      unsubscribed: true,
      communication_opt_in: true,
    } as any);

    const result = await checkCommunicationSafety("c-unsub");
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("UNSUBSCRIBED");
  });

  it("blocks communication if daily message cap is exceeded", async () => {
    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValueOnce({
      id: "p-1",
      customer_id: "c-capped",
      unsubscribed: false,
      communication_opt_in: true,
      daily_message_limit: 2,
    } as any);

    // 2 sent today
    vi.spyOn(csRepo, "listCustomerInterventions").mockResolvedValueOnce([
      { status: "SENT", executed_at: new Date().toISOString() },
      { status: "SENT", executed_at: new Date().toISOString() },
    ] as any);

    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const result = await checkCommunicationSafety("c-capped");
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("DAILY_LIMIT_EXCEEDED");
  });

  it("allows communication when within limits", async () => {
    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValueOnce({
      id: "p-1",
      customer_id: "c-ok",
      unsubscribed: false,
      communication_opt_in: true,
      daily_message_limit: 2,
    } as any);

    vi.spyOn(csRepo, "listCustomerInterventions").mockResolvedValueOnce([]);

    const result = await checkCommunicationSafety("c-ok", { bypassLimits: true });
    expect(result.allowed).toBe(true);
  });
});
