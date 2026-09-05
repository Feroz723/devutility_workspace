import { describe, it, expect, vi } from "vitest";
import { evaluateChannelPerformance } from "@/distribution/analysis";
import * as metricsModule from "@/distribution/metrics";

describe("Channel Performance Analysis & Classification", () => {
  it("classifies high conversions as WINNING", async () => {
    vi.spyOn(metricsModule, "aggregateChannelMetrics").mockResolvedValueOnce({
      impressions: 500,
      clicks: 50,
      visitors: 40,
      signups: 6,
      leads: 2,
      cost_inr: 0,
      ctr: 10,
      signup_conversion_rate: 15,
      lead_conversion_rate: 5,
    });

    const result = await evaluateChannelPerformance("fake-campaign", "GITHUB", false);
    expect(result.classification).toBe("WINNING");
    expect(result.action_recommendation).toBe("SCALE");
    expect(result.cost_inr).toBe(0);
  });

  it("classifies healthy traffic with zero conversions as ITERATE", async () => {
    vi.spyOn(metricsModule, "aggregateChannelMetrics").mockResolvedValueOnce({
      impressions: 400,
      clicks: 30,
      visitors: 25,
      signups: 0,
      leads: 0,
      cost_inr: 0,
      ctr: 7.5,
      signup_conversion_rate: 0,
      lead_conversion_rate: 0,
    });

    const result = await evaluateChannelPerformance("fake-campaign", "REDDIT", false);
    expect(result.classification).toBe("ITERATE");
    expect(result.action_recommendation).toBe("ADJUST_COPY");
  });

  it("classifies high impressions with near-zero clicks as STOP", async () => {
    vi.spyOn(metricsModule, "aggregateChannelMetrics").mockResolvedValueOnce({
      impressions: 250,
      clicks: 1,
      visitors: 1,
      signups: 0,
      leads: 0,
      cost_inr: 0,
      ctr: 0.4,
      signup_conversion_rate: 0,
      lead_conversion_rate: 0,
    });

    const result = await evaluateChannelPerformance("fake-campaign", "X", false);
    expect(result.classification).toBe("STOP");
    expect(result.action_recommendation).toBe("STOP");
  });
});
