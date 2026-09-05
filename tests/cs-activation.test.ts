import { describe, it, expect, vi } from "vitest";
import { getActivationMetrics, recordActivationMilestone } from "@/customer-success/activation";
import * as csRepo from "@/database/repositories/customer-success-repo";

describe("Customer Success - Activation", () => {
  it("reports insufficient data honestly when sample size < 3", async () => {
    vi.spyOn(csRepo, "listCustomerActivations").mockResolvedValueOnce([
      { status: "ACTIVATED", time_to_value_seconds: 120 } as any,
    ]);

    const metrics = await getActivationMetrics({ product_id: "prod-1" });
    expect(metrics.total_tracked).toBe(1);
    expect(metrics.total_activated).toBe(1);
    expect(metrics.activation_rate_percent).toBe(100);
    expect(metrics.has_sufficient_data).toBe(false);
  });

  it("calculates activation rate and median time-to-value accurately with sufficient data", async () => {
    vi.spyOn(csRepo, "listCustomerActivations").mockResolvedValueOnce([
      { status: "ACTIVATED", time_to_value_seconds: 60 } as any,
      { status: "ACTIVATED", time_to_value_seconds: 120 } as any,
      { status: "ACTIVATED", time_to_value_seconds: 180 } as any,
      { status: "IN_PROGRESS", time_to_value_seconds: null } as any,
    ]);

    const metrics = await getActivationMetrics({ product_id: "prod-1" });
    expect(metrics.total_tracked).toBe(4);
    expect(metrics.total_activated).toBe(3);
    expect(metrics.activation_rate_percent).toBe(75);
    expect(metrics.has_sufficient_data).toBe(true);
    expect(metrics.average_time_to_value_seconds).toBe(120);
    expect(metrics.median_time_to_value_seconds).toBe(120);
  });

  it("records milestone completion and advances status to ACTIVATED when completed", async () => {
    vi.spyOn(csRepo, "getCustomerActivation").mockResolvedValueOnce({
      id: "act-1",
      customer_id: "c-1",
      product_id: "p-1",
      status: "IN_PROGRESS",
      milestones_total: 2,
      milestones_completed: 1,
    } as any);

    const upsertSpy = vi.spyOn(csRepo, "upsertCustomerActivation").mockResolvedValueOnce({
      id: "act-1",
      status: "ACTIVATED",
      milestones_completed: 2,
      milestones_total: 2,
    } as any);

    const res = await recordActivationMilestone("c-1", "p-1", "Done Step 2");
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "c-1",
        product_id: "p-1",
        status: "ACTIVATED",
        milestones_completed: 2,
      })
    );
  });
});
