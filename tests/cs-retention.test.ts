import { describe, it, expect, vi } from "vitest";
import { calculateCohortRetention } from "@/customer-success/retention";
import * as csRepo from "@/database/repositories/customer-success-repo";

describe("Customer Success - Retention", () => {
  it("marks has_sufficient_data as false when cohort size < 5", async () => {
    vi.spyOn(csRepo, "listCustomerProfiles").mockResolvedValueOnce([
      { customer_id: "c-1", created_at: "2026-09-01T10:00:00Z" } as any,
      { customer_id: "c-2", created_at: "2026-09-01T11:00:00Z" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerEvents").mockResolvedValue([]);
    vi.spyOn(csRepo, "upsertCustomerRetention").mockResolvedValueOnce({} as any);

    const result = await calculateCohortRetention("2026-09-01");
    expect(result.cohort_size).toBe(2);
    expect(result.has_sufficient_data).toBe(false);
  });

  it("calculates retention and repeat usage rate accurately for cohort", async () => {
    const cohortDateStr = "2026-08-01";
    const cohortStart = new Date("2026-08-01T00:00:00Z");

    const mockProfiles = Array.from({ length: 6 }, (_, i) => ({
      customer_id: `c-${i}`,
      created_at: "2026-08-01T08:00:00Z",
    }));

    vi.spyOn(csRepo, "listCustomerProfiles").mockResolvedValueOnce(mockProfiles as any);

    // 4 customers have repeat events
    vi.spyOn(csRepo, "listCustomerEvents").mockImplementation(async (opts) => {
      const idx = parseInt(opts?.customer_id?.split("-")[1] || "0", 10);
      if (idx < 4) {
        return [
          { created_at: "2026-08-01T09:00:00Z" },
          { created_at: "2026-08-02T09:00:00Z" }, // Day 1
        ] as any;
      }
      return [{ created_at: "2026-08-01T09:00:00Z" }] as any;
    });

    vi.spyOn(csRepo, "upsertCustomerRetention").mockResolvedValueOnce({} as any);

    const result = await calculateCohortRetention(cohortDateStr);
    expect(result.cohort_size).toBe(6);
    expect(result.day_1_retained).toBe(4);
    expect(result.repeat_usage_rate_percent).toBe(67);
    expect(result.has_sufficient_data).toBe(true);
  });
});
