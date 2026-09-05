import { describe, it, expect, vi } from "vitest";
import { runDistributionPipeline } from "@/distribution/runner";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { productRepo } from "@/database/repositories/product-repo";

describe("Autonomous Distribution Runner Pipeline", () => {
  it("safely handles non-existent campaigns gracefully", async () => {
    vi.spyOn(distributionRepo, "getCampaign").mockResolvedValueOnce(null);

    const result = await runDistributionPipeline({
      campaign_id: "00000000-0000-0000-0000-000000000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("CAMPAIGN_NOT_FOUND");
  });

  it("blocks execution if zero-cost policy is violated", async () => {
    vi.spyOn(distributionRepo, "getCampaign").mockResolvedValueOnce({
      id: "fake-camp",
      product_id: "fake-prod",
      name: "Paid Ads Campaign",
      slug: "paid-ads",
      status: "DRAFT",
      budget_inr: 5000, // Non-zero budget!
      actual_spend_inr: 0,
      target_metrics: {},
      actual_metrics: {},
      learnings: {},
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.spyOn(productRepo, "findById").mockResolvedValueOnce({
      id: "fake-prod",
      name: "Test Tool",
      slug: "test-tool",
      description: "Test",
      problem: "Test",
      solution: "Test",
      value_proposition: "Test",
      product_type: "FREE_TOOL",
      status: "READY",
      build_status: "READY",
      estimated_cost_inr: 0,
      actual_cost_inr: 0,
      cost_classification: "ZERO_COST",
      build_plan: {} as any,
      tech_stack: [],
      version: "1.0.0",
      learning_data: {},
      creation_status: "ready",
      publishing_status: "published",
      price: 0,
      currency: "INR",
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    vi.spyOn(distributionRepo, "updateCampaign").mockResolvedValueOnce(null as any);

    const result = await runDistributionPipeline({
      campaign_id: "fake-camp",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("ZERO_COST_VIOLATION");
    expect(result.status).toBe("PAUSED");
  });
});
