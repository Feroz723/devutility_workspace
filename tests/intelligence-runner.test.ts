import { describe, it, expect, vi, beforeEach } from "vitest";
import { autonomousIntelligenceRunner } from "@/intelligence/runner";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import { businessSnapshotAggregator } from "@/intelligence/snapshot";
import { businessMetricsEngine } from "@/intelligence/metrics";
import { unitEconomicsEngine } from "@/intelligence/unit-economics";
import { productPerformanceEvaluator } from "@/intelligence/product-performance";
import { channelPerformanceEvaluator } from "@/intelligence/channel-performance";
import { offerPerformanceEvaluator } from "@/intelligence/offer-performance";
import { customerCohortAnalyzer } from "@/intelligence/cohorts";
import { businessRiskDetector } from "@/intelligence/risk";
import { businessGoalTracker } from "@/intelligence/goals";
import { resourceAllocationEngine } from "@/intelligence/resource-allocation";
import { businessForecastingEngine } from "@/intelligence/forecast";
import { businessLearningEngine } from "@/intelligence/learning";
import { portfolioDecisionEngine } from "@/intelligence/decision-engine";
import * as dbClient from "@/database/client";

vi.mock("@/database/client", () => ({
  queryMany: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  getPool: vi.fn(),
}));

describe("Phase 10 — Autonomous Intelligence Runner Pipeline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("orchestrates a full autonomous intelligence cycle seamlessly", async () => {
    // 1. Mock DB and repo methods
    const saveJobSpy = vi.spyOn(intelligenceRepo, "saveJob").mockResolvedValue({} as any);
    const updateJobStatusSpy = vi.spyOn(intelligenceRepo, "updateJobStatus").mockResolvedValue({} as any);
    const logEventSpy = vi.spyOn(intelligenceRepo, "logEvent").mockResolvedValue({} as any);

    // Mock products and offers queryMany
    vi.spyOn(dbClient, "queryMany").mockImplementation(async (sql: string) => {
      if (sql.includes("products")) {
        return [{ id: "prod-1", name: "Dev Productivity API" }];
      }
      if (sql.includes("offers")) {
        return [{ id: "offer-1", title: "Monthly Pro Pass" }];
      }
      return [];
    });

    // Mock sub-engines
    vi.spyOn(businessGoalTracker, "ensureBaselineGoals").mockResolvedValue();
    vi.spyOn(businessGoalTracker, "evaluateGoals").mockResolvedValue([]);
    vi.spyOn(businessSnapshotAggregator, "captureSnapshot").mockResolvedValue({
      snapshot: {
        id: "snap-1",
        open_support_tickets_count: 2,
      } as any,
      metrics_count: 5,
      timestamp: new Date().toISOString(),
    });
    vi.spyOn(businessMetricsEngine, "computeFunnelMetrics").mockResolvedValue({
      visitors: 100,
      leads: 5,
      signups: 2,
      checkouts: 2,
      paid_orders: 1,
      lead_conversion_percent: 5,
      checkout_conversion_percent: 2,
      payment_conversion_percent: 50,
      refund_rate_percent: 0,
      gross_revenue_inr: 500,
      net_revenue_inr: 500,
      average_order_value_inr: 500,
      revenue_per_visitor_inr: 5,
      revenue_per_customer_inr: 500,
      has_sufficient_data: true,
    });
    vi.spyOn(unitEconomicsEngine, "computeEconomics").mockResolvedValue({} as any);
    vi.spyOn(productPerformanceEvaluator, "evaluateProduct").mockResolvedValue({} as any);
    vi.spyOn(channelPerformanceEvaluator, "evaluateChannel").mockResolvedValue({} as any);
    vi.spyOn(offerPerformanceEvaluator, "evaluateOffer").mockResolvedValue({} as any);
    vi.spyOn(customerCohortAnalyzer, "analyzeCohorts").mockResolvedValue({
      cohorts: [],
      total_customers_analyzed: 0,
      has_sufficient_data: false,
    });
    vi.spyOn(businessRiskDetector, "detectRisks").mockResolvedValue([
      { risk_type: "REVENUE_CONCENTRATION", severity: "LOW" } as any,
    ]);
    vi.spyOn(resourceAllocationEngine, "rebalanceAllocations").mockResolvedValue([] as any);
    vi.spyOn(businessForecastingEngine, "generateForecasts").mockResolvedValue([] as any);
    vi.spyOn(businessLearningEngine, "harvestLearnings").mockResolvedValue([] as any);

    // Run cycle
    const result = await autonomousIntelligenceRunner.runIntelligenceCycle(false);

    expect(result.status).toBe("COMPLETED");
    expect(result.snapshot_id).toBe("snap-1");
    expect(result.products_evaluated).toBe(1);
    expect(result.channels_evaluated).toBe(5); // 5 canonical channels
    expect(result.offers_evaluated).toBe(1);
    expect(result.risks_detected).toBe(1);
    expect(result.decisions_proposed).toBe(2); // 1 product + 1 offer
    expect(result.execution_duration_ms).toBeGreaterThanOrEqual(0);

    // Verify job status and audit logging were triggered
    expect(saveJobSpy).toHaveBeenCalledTimes(1);
    expect(updateJobStatusSpy).toHaveBeenCalledWith(
      result.job_id,
      "COMPLETED",
      expect.objectContaining({
        products_evaluated: 1,
        channels_evaluated: 5,
      })
    );
    expect(logEventSpy).toHaveBeenCalledWith(
      "BUSINESS_JOB_COMPLETED",
      "BUSINESS_JOB",
      result.job_id,
      expect.any(Object)
    );
  });

  it("handles and gracefully records failures during intelligence cycle", async () => {
    vi.spyOn(intelligenceRepo, "saveJob").mockResolvedValue({} as any);
    const updateJobStatusSpy = vi.spyOn(intelligenceRepo, "updateJobStatus").mockResolvedValue({} as any);

    vi.spyOn(businessGoalTracker, "ensureBaselineGoals").mockRejectedValue(
      new Error("Database connection pool timeout")
    );

    const result = await autonomousIntelligenceRunner.runIntelligenceCycle(false);

    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("Database connection pool timeout");
    expect(updateJobStatusSpy).toHaveBeenCalledWith(
      result.job_id,
      "FAILED",
      null,
      "Database connection pool timeout"
    );
  });
});
