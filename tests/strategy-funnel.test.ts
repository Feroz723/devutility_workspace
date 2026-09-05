import { describe, it, expect, vi, beforeEach } from "vitest";
import { funnelAnalysisEngine } from "@/strategy/funnel-analysis-engine";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import * as intelligenceRepo from "@/database/repositories/intelligence-repo";
import * as salesRepo from "@/database/repositories/sales-repo";
import * as customerRepo from "@/database/repositories/customer-success-repo";
import * as dbClient from "@/database/client";

describe("Phase 13 — 9-Stage Funnel & Sample Size Guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("marks stages with < 10 events as INSUFFICIENT_DATA and guards conversion rate", async () => {
    vi.spyOn(intelligenceRepo, "getLatestBusinessSnapshot").mockResolvedValue({
      total_visitors_count: 5,
      total_leads_count: 1,
      total_signups_count: 1,
      total_customers_count: 0,
      total_revenue_inr: 0,
    } as any);

    vi.spyOn(salesRepo, "listOrders").mockResolvedValue([]);
    vi.spyOn(salesRepo, "listCheckoutSessions").mockResolvedValue([]);
    vi.spyOn(customerRepo, "listCustomerProfiles").mockResolvedValue([{ id: "cust-1", journey_stage: "ACTIVE" } as any]);
    vi.spyOn(dbClient, "queryMany").mockResolvedValue([]);

    vi.spyOn(strategyRepo, "recordFunnelStage").mockImplementation(async (stage: any) => ({
      ...stage,
      id: "stage-test",
      recorded_at: new Date().toISOString(),
    }));

    const stages = await funnelAnalysisEngine.analyzeFunnel("prod-test", false);

    expect(stages.length).toBe(9);
    const visitStage = stages.find((s) => s.stage_name === "VISIT");
    expect(visitStage?.raw_count).toBe(5);
    expect(visitStage?.sample_size_status).toBe("INSUFFICIENT_DATA");
    expect(visitStage?.confidence).toBe("INSUFFICIENT_DATA");
  });

  it("calculates reliable conversion rates and detects bottleneck when sample size >= 10", async () => {
    vi.spyOn(intelligenceRepo, "getLatestBusinessSnapshot").mockResolvedValue({
      total_visitors_count: 100,
      total_leads_count: 30,
      total_signups_count: 5, // 5% conversion from 100 visits -> steep dropoff (<15%)
      total_customers_count: 1,
      total_revenue_inr: 499,
    } as any);

    vi.spyOn(salesRepo, "listOrders").mockResolvedValue([{ id: "o-1", status: "PAID", amount_paid_inr: 499 } as any]);
    vi.spyOn(salesRepo, "listCheckoutSessions").mockResolvedValue([{ id: "cs-1" } as any]);
    vi.spyOn(customerRepo, "listCustomerProfiles").mockResolvedValue([
      { id: "c-1", journey_stage: "ACTIVATED" } as any,
    ]);
    vi.spyOn(dbClient, "queryMany").mockResolvedValue([]);

    vi.spyOn(strategyRepo, "recordFunnelStage").mockImplementation(async (stage: any) => ({
      ...stage,
      id: "stage-test-2",
      recorded_at: new Date().toISOString(),
    }));

    const stages = await funnelAnalysisEngine.analyzeFunnel("prod-test-2", false);

    const visitStage = stages.find((s) => s.stage_name === "VISIT");
    expect(visitStage?.raw_count).toBe(100);
    expect(visitStage?.sample_size_status).toBe("SUFFICIENT");
    expect(visitStage?.bottleneck_candidate).toBe(true);
    expect(visitStage?.conversion_rate_to_next).toBe(5); // 5 / 100 = 5%
  });
});
