import { describe, it, expect } from "vitest";
import { CreateMetricInputSchema } from "@/types/experiment";

describe("Experiment Engine — Metric Tracking & Validation", () => {
  it("validates manual metric input schema correctly", () => {
    const valid = CreateMetricInputSchema.safeParse({
      experiment_id: "22222222-2222-2222-2222-222222222222",
      metric_name: "signups",
      metric_value: 15,
      source: "MANUAL",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.metric_name).toBe("signups");
      expect(valid.data.metric_value).toBe(15);
      expect(valid.data.source).toBe("MANUAL");
    }
  });

  it("validates website metric input with automated source tag", () => {
    const valid = CreateMetricInputSchema.safeParse({
      experiment_id: "22222222-2222-2222-2222-222222222222",
      metric_name: "views",
      metric_value: 120,
      source: "WEBSITE",
      unit: "pageviews",
    });

    expect(valid.success).toBe(true);
  });

  it("rejects invalid metric payload (missing experiment_id or negative value where not permitted)", () => {
    const invalid = CreateMetricInputSchema.safeParse({
      metric_name: "signups",
      metric_value: 5,
    });

    expect(invalid.success).toBe(false);
  });
});
