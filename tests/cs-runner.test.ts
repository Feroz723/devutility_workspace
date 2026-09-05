import { describe, it, expect, vi } from "vitest";
import { runCustomerSuccessPipeline } from "@/customer-success/runner";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Autonomous Pipeline Runner", () => {
  it("executes customer success pipeline batch run and records completed job", async () => {
    vi.spyOn(csRepo, "createCustomerSuccessJob").mockResolvedValueOnce({
      id: "job-1",
      job_type: "CALCULATE_HEALTH",
      status: "PENDING",
    } as any);

    const updateJobSpy = vi.spyOn(csRepo, "updateCustomerSuccessJob").mockResolvedValue({} as any);

    vi.spyOn(csRepo, "listCustomerProfiles").mockResolvedValue([
      { customer_id: "c-1", created_at: "2026-09-01T10:00:00Z" } as any,
    ]);

    vi.spyOn(csRepo, "getCustomerHealthByCustomerId").mockResolvedValue({
      status: "HEALTHY",
      health_score: 85,
    } as any);

    vi.spyOn(csRepo, "listCustomerEvents").mockResolvedValue([
      { created_at: new Date().toISOString(), event_type: "FEATURE_USED" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerSessions").mockResolvedValue([]);
    vi.spyOn(csRepo, "listCustomerActivations").mockResolvedValue([]);
    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValue([]);
    vi.spyOn(csRepo, "listCustomerFeedback").mockResolvedValue([]);
    vi.spyOn(csRepo, "upsertCustomerHealth").mockResolvedValue({} as any);
    vi.spyOn(csRepo, "upsertCustomerRetention").mockResolvedValue({} as any);
    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValue(null);
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);

    const result = await runCustomerSuccessPipeline({ is_demo: false });

    expect(result.job_id).toBe("job-1");
    expect(result.customers_evaluated).toBe(1);
    expect(result.health_calculated).toBe(1);
    expect(updateJobSpy).toHaveBeenCalledWith("job-1", expect.objectContaining({
      status: "COMPLETED",
    }));
  });
});
