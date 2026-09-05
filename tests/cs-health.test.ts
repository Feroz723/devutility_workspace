import { describe, it, expect, vi } from "vitest";
import { calculateCustomerHealth } from "@/customer-success/health";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Health Calculation", () => {
  it("returns UNKNOWN status when customer has zero telemetry events", async () => {
    vi.spyOn(csRepo, "listCustomerEvents").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "listCustomerSessions").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "listCustomerActivations").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "upsertCustomerHealth").mockResolvedValueOnce({} as any);

    const result = await calculateCustomerHealth("c-empty");
    expect(result.status).toBe("UNKNOWN");
    expect(result.signals[0]).toContain("No telemetry recorded");
  });

  it("calculates HEALTHY status for active, activated customer with recent events", async () => {
    const now = new Date();
    vi.spyOn(csRepo, "listCustomerEvents").mockResolvedValueOnce([
      { created_at: now.toISOString(), event_type: "FEATURE_USED" } as any,
      { created_at: now.toISOString(), event_type: "FEATURE_USED" } as any,
      { created_at: now.toISOString(), event_type: "FIRST_VALUE" } as any,
      { created_at: now.toISOString(), event_type: "FEATURE_USED" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerSessions").mockResolvedValueOnce([
      { started_at: now.toISOString() } as any,
      { started_at: now.toISOString() } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerActivations").mockResolvedValueOnce([
      { customer_id: "c-active", status: "ACTIVATED" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "upsertCustomerHealth").mockResolvedValueOnce({} as any);
    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValueOnce(null);
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const result = await calculateCustomerHealth("c-active");
    expect(result.status).toBe("HEALTHY");
    expect(result.health_score).toBeGreaterThanOrEqual(70);
    expect(result.recency_score).toBe(100);
  });

  it("penalizes health score and flags AT_RISK or DORMANT if inactive or critical tickets exist", async () => {
    const pastDate = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000); // 25 days ago
    vi.spyOn(csRepo, "listCustomerEvents").mockResolvedValueOnce([
      { created_at: pastDate.toISOString(), event_type: "FEATURE_USED" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerSessions").mockResolvedValueOnce([]);
    vi.spyOn(csRepo, "listCustomerActivations").mockResolvedValueOnce([
      { customer_id: "c-stalled", status: "STALLED" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValueOnce([
      { severity: "CRITICAL", status: "OPEN" } as any,
    ]);
    vi.spyOn(csRepo, "upsertCustomerHealth").mockResolvedValueOnce({} as any);
    vi.spyOn(csRepo, "getCustomerProfileByCustomerId").mockResolvedValueOnce(null);
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const result = await calculateCustomerHealth("c-stalled");
    expect(["AT_RISK", "DORMANT", "CHURNED"]).toContain(result.status);
    expect(result.health_score).toBeLessThan(50);
  });
});
