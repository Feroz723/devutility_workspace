import { describe, it, expect, vi, beforeEach } from "vitest";
import { researchCycleAdapter } from "@/runtime/adapters/research-adapter";
import { validationCycleAdapter } from "@/runtime/adapters/validation-adapter";
import { experimentCycleAdapter } from "@/runtime/adapters/experiment-adapter";
import { productCycleAdapter } from "@/runtime/adapters/product-adapter";
import { distributionCycleAdapter } from "@/runtime/adapters/distribution-adapter";
import { salesCycleAdapter } from "@/runtime/adapters/sales-adapter";
import { customerSuccessCycleAdapter } from "@/runtime/adapters/customer-success-adapter";
import { intelligenceCycleAdapter } from "@/runtime/adapters/intelligence-adapter";
import * as researchModule from "@/research/cycle";
import * as oppRepo from "@/database/repositories/opportunity-repo";
import * as expRepo from "@/database/repositories/experiment-repo";
import * as prodRepo from "@/database/repositories/product-repo";
import * as distRepo from "@/database/repositories/distribution-repo";
import { SalesRunner } from "@/sales/runner";
import * as csRunner from "@/customer-success/runner";
import { autonomousIntelligenceRunner } from "@/intelligence/runner";

describe("Phase 12 — Cross-Phase Adapters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ResearchAdapter executes research cycle and returns result", async () => {
    vi.spyOn(researchModule, "executeResearchCycle").mockResolvedValue({
      runId: "run-1",
      status: "completed",
      queriesExecuted: ["developer tools"],
      providersUsed: ["hackernews"],
      rawItemsFound: 5,
      opportunitiesCreated: 2,
      opportunitiesUpdated: 1,
      evidenceCollected: 3,
      durationMs: 1200,
      errors: [],
      costClassification: "FREE",
    });

    const result = await researchCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(3);
    expect(result.items_processed).toBe(3);
    expect(result.status).toBe("SUCCESS");
  });

  it("ValidationAdapter returns NOTHING_ELIGIBLE when no candidates found", async () => {
    vi.spyOn(oppRepo, "listOpportunities").mockResolvedValue({
      opportunities: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    const result = await validationCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(4);
    expect(result.status).toBe("NOTHING_ELIGIBLE");
    expect(result.items_processed).toBe(0);
  });

  it("ExperimentAdapter returns NOTHING_ELIGIBLE when no experiments need transition", async () => {
    vi.spyOn(expRepo, "listExperiments").mockResolvedValue({
      experiments: [],
      total: 0,
    });

    const result = await experimentCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(5);
    expect(result.status).toBe("NOTHING_ELIGIBLE");
  });

  it("ProductAdapter returns NOTHING_ELIGIBLE when no products in draft state", async () => {
    vi.spyOn(prodRepo, "listProducts").mockResolvedValue({
      products: [],
      total: 0,
    });

    const result = await productCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(6);
    expect(result.status).toBe("NOTHING_ELIGIBLE");
  });

  it("DistributionAdapter returns NOTHING_ELIGIBLE when no campaigns active", async () => {
    vi.spyOn(distRepo.distributionRepo, "listCampaigns").mockResolvedValue({
      campaigns: [],
      total: 0,
    });

    const result = await distributionCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(7);
    expect(result.status).toBe("NOTHING_ELIGIBLE");
  });

  it("SalesAdapter executes SalesRunner and reports offers checked", async () => {
    vi.spyOn(SalesRunner, "runCycle").mockResolvedValue({
      cycleTimestamp: new Date().toISOString(),
      offersChecked: 2,
      offersPublished: 1,
      pendingDeliveriesProcessed: 1,
      successfulDeliveries: 1,
      failedDeliveries: 0,
      refundsProcessed: 0,
      metricsCalculated: true,
      errors: [],
    });

    const result = await salesCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(8);
    expect(result.items_processed).toBe(2);
    expect(result.status).toBe("SUCCESS");
  });

  it("CustomerSuccessAdapter runs CS pipeline and returns summary", async () => {
    vi.spyOn(csRunner, "runCustomerSuccessPipeline").mockResolvedValue({
      job_id: "cs-job-1",
      customers_evaluated: 3,
      support_triaged: 2,
      health_calculated: 3,
      churn_alerts: 0,
      interventions_proposed: 1,
    } as any);

    const result = await customerSuccessCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(9);
    expect(result.items_processed).toBe(5);
  });

  it("IntelligenceAdapter runs intelligence cycle and returns decisions count", async () => {
    vi.spyOn(autonomousIntelligenceRunner, "runIntelligenceCycle").mockResolvedValue({
      job_id: "int-job-1",
      snapshot_id: "snap-1",
      status: "COMPLETED",
      products_evaluated: 2,
      channels_evaluated: 1,
      offers_evaluated: 0,
      risks_detected: 0,
      decisions_proposed: 3,
      execution_duration_ms: 150,
    } as any);

    const result = await intelligenceCycleAdapter.execute();

    expect(result.success).toBe(true);
    expect(result.phase).toBe(10);
    expect(result.items_processed).toBe(3);
  });
});
