import { describe, it, expect, vi, beforeEach } from "vitest";
import { SalesEligibilityChecker } from "@/sales/eligibility";
import * as productRepo from "@/database/repositories/product-repo";
import * as salesRepo from "@/database/repositories/sales-repo";

describe("SalesEligibilityChecker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(productRepo, "listProductArtifacts").mockResolvedValue([]);
    vi.spyOn(salesRepo, "listOffers").mockResolvedValue([]);
  });

  it("returns ineligible if product does not exist", async () => {
    vi.spyOn(productRepo, "getProductById").mockResolvedValueOnce(null);

    const result = await SalesEligibilityChecker.checkProductEligibility("non-existent-id");
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Product not found");
  });

  it("returns ineligible if product is not READY or LIVE", async () => {
    vi.spyOn(productRepo, "getProductById").mockResolvedValueOnce({
      id: "prod-1",
      name: "Draft Tool",
      slug: "draft-tool",
      product_type: "MICRO_SAAS",
      status: "BUILDING",
      build_status: "GENERATING",
      estimated_cost_inr: 0,
      actual_cost_inr: 0,
      cost_classification: "ZERO_COST",
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    const result = await SalesEligibilityChecker.checkProductEligibility("prod-1");
    expect(result.eligible).toBe(false);
    expect(result.checks.productStatusValid).toBe(false);
  });

  it("returns ineligible if product violated zero build cost policy", async () => {
    vi.spyOn(productRepo, "getProductById").mockResolvedValueOnce({
      id: "prod-2",
      name: "Expensive Tool",
      slug: "expensive-tool",
      product_type: "MICRO_SAAS",
      status: "READY",
      build_status: "READY",
      estimated_cost_inr: 5000,
      actual_cost_inr: 2500,
      cost_classification: "PAID_APPROVED",
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    const result = await SalesEligibilityChecker.checkProductEligibility("prod-2");
    expect(result.eligible).toBe(false);
    expect(result.checks.buildCostZero).toBe(false);
  });

  it("returns eligible when product is READY, zero-cost, and has deliverables", async () => {
    vi.spyOn(productRepo, "getProductById").mockResolvedValueOnce({
      id: "prod-3",
      name: "Validated Tool",
      slug: "validated-tool",
      product_type: "FREE_TOOL",
      status: "READY",
      build_status: "READY",
      estimated_cost_inr: 0,
      actual_cost_inr: 0,
      cost_classification: "ZERO_COST",
      deliverables: ["CLI binary", "User guide"],
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    vi.spyOn(productRepo, "listProductArtifacts").mockResolvedValueOnce([
      { id: "art-1", product_id: "prod-3", artifact_type: "SOURCE_CODE", file_path: "index.js", content: "console.log('hi');" } as any,
    ]);

    vi.spyOn(salesRepo, "listOffers").mockResolvedValueOnce([]);

    const result = await SalesEligibilityChecker.checkProductEligibility("prod-3");
    expect(result.eligible).toBe(true);
    expect(result.checks.productExists).toBe(true);
    expect(result.checks.productStatusValid).toBe(true);
    expect(result.checks.buildCostZero).toBe(true);
    expect(result.checks.qualityGatePassed).toBe(true);
  });
});
