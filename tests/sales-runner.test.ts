import { describe, it, expect, vi } from "vitest";
import { SalesRunner } from "@/sales/runner";
import { SalesEligibilityChecker } from "@/sales/eligibility";
import { OfferManager } from "@/sales/offer";
import { DeliveryEngine } from "@/sales/delivery";
import { SalesAnalyticsEngine } from "@/sales/analysis";
import * as productRepo from "@/database/repositories/product-repo";

describe("SalesRunner - Autonomous Operations Cycle", () => {
  it("runs full sales operations cycle without crashing", async () => {
    vi.spyOn(productRepo, "listProducts").mockResolvedValueOnce({
      products: [
        { id: "p-1", name: "Ready Tool", product_type: "FREE_TOOL", status: "READY" } as any,
      ],
      total: 1,
    });

    vi.spyOn(SalesEligibilityChecker, "checkProductEligibility").mockResolvedValueOnce({
      eligible: true,
      productId: "p-1",
      reason: "OK",
      checks: {
        productExists: true,
        productStatusValid: true,
        hasApprovedArtifacts: true,
        buildCostZero: true,
        qualityGatePassed: true,
        noActiveBlockingOffer: true,
      },
    });

    vi.spyOn(OfferManager, "createOfferFromProduct").mockResolvedValueOnce({ id: "off-1" } as any);
    vi.spyOn(OfferManager, "publishOffer").mockResolvedValueOnce({ id: "off-1", status: "ACTIVE" } as any);
    vi.spyOn(DeliveryEngine, "retryPendingDeliveries").mockResolvedValueOnce({ retried: 2, succeeded: 2 });
    vi.spyOn(SalesAnalyticsEngine, "recordDailyAggregate").mockResolvedValueOnce();

    const result = await SalesRunner.runCycle();

    expect(result.offersChecked).toBe(1);
    expect(result.offersPublished).toBe(1);
    expect(result.pendingDeliveriesProcessed).toBe(2);
    expect(result.successfulDeliveries).toBe(2);
    expect(result.metricsCalculated).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
