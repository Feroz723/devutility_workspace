import { describe, it, expect, vi } from "vitest";
import { detectCustomerChurn } from "@/customer-success/churn";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Churn Detection", () => {
  it("detects CONFIRMED_CHURN and root cause CANCELLATION on explicit cancellation event", async () => {
    vi.spyOn(csRepo, "getCustomerHealthByCustomerId").mockResolvedValueOnce(null);
    vi.spyOn(csRepo, "listCustomerEvents").mockResolvedValueOnce([
      { event_type: "SUBSCRIPTION_CANCELLED", created_at: new Date().toISOString() } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerFeedback").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "upsertCustomerChurn").mockResolvedValueOnce({} as any);
    vi.spyOn(csRepo, "upsertCustomerProfile").mockResolvedValueOnce({} as any);
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const result = await detectCustomerChurn("c-cancelled");
    expect(result.churn_status).toBe("CONFIRMED_CHURN");
    expect(result.primary_reason).toBe("CANCELLATION");
    expect(result.risk_score).toBe(100);
  });

  it("classifies as CHURN_RISK with reason PRODUCT_DISSATISFACTION when negative feedback submitted", async () => {
    vi.spyOn(csRepo, "getCustomerHealthByCustomerId").mockResolvedValueOnce({
      status: "AT_RISK",
      health_score: 45,
    } as any);
    vi.spyOn(csRepo, "listCustomerEvents").mockResolvedValueOnce([
      { event_type: "FEATURE_USED", created_at: new Date().toISOString() } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerFeedback").mockResolvedValueOnce([
      { feedback_type: "COMPLAINT", sentiment: "NEGATIVE", comment: "Doesn't work well" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "upsertCustomerChurn").mockResolvedValueOnce({} as any);
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const result = await detectCustomerChurn("c-dissatisfied");
    expect(result.churn_status).toBe("CHURN_RISK");
    expect(result.primary_reason).toBe("PRODUCT_DISSATISFACTION");
    expect(result.risk_score).toBeGreaterThanOrEqual(40);
  });
});
