import { describe, it, expect } from "vitest";
import { verifyZeroCostDistribution, evaluateDistributionZeroCost } from "@/distribution/guard";
import type { DistributionCampaign } from "@/types/distribution";

describe("Distribution Zero-Cost Guard", () => {
  it("approves clean zero-cost organic channels and zero budget", () => {
    const check = verifyZeroCostDistribution(
      ["OWNED_WEBSITE", "SEO", "GITHUB", "REDDIT"],
      ["Organic release on GitHub Discussions", "SEO landing page"],
      0
    );
    expect(check.compliant).toBe(true);
    expect(check.estimatedCostInr).toBe(0);
    expect(check.flaggedItems.length).toBe(0);
  });

  it("blocks non-zero proposed budgets", () => {
    const check = verifyZeroCostDistribution(["OWNED_WEBSITE"], ["Test"], 1500);
    expect(check.compliant).toBe(false);
    expect(check.estimatedCostInr).toBeGreaterThan(0);
    expect(check.flaggedItems.some((f) => f.includes("Proposed distribution budget is non-zero"))).toBe(true);
  });

  it("blocks paid PPC keywords like Google Ads and Meta Ads", () => {
    const check = verifyZeroCostDistribution(
      ["OWNED_WEBSITE"],
      ["Run google_ads campaign targeting keywords", "Buy meta_ads banner"],
      0
    );
    expect(check.compliant).toBe(false);
    expect(check.flaggedItems.some((f) => f.includes("Paid PPC Advertising"))).toBe(true);
  });

  it("blocks paid influencers and bought engagement", () => {
    const check = verifyZeroCostDistribution(
      ["SOCIAL_MEDIA"],
      ["Hire paid_influencer for launch shoutout", "buy_followers on twitter"],
      0
    );
    expect(check.compliant).toBe(false);
    expect(check.flaggedItems.some((f) => f.includes("Paid Influencer Campaign"))).toBe(true);
    expect(check.flaggedItems.some((f) => f.includes("Purchased Engagement"))).toBe(true);
  });

  it("evaluates campaign models correctly", () => {
    const camp: DistributionCampaign = {
      id: "11111111-1111-1111-1111-111111111111",
      product_id: "22222222-2222-2222-2222-222222222222",
      name: "Clean Organic Launch",
      slug: "clean-organic-launch",
      status: "DRAFT",
      budget_inr: 0,
      actual_spend_inr: 0,
      target_metrics: {},
      actual_metrics: {},
      learnings: {},
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const check = evaluateDistributionZeroCost({ campaign: camp });
    expect(check.compliant).toBe(true);
    expect(check.estimatedCostInr).toBe(0);
  });
});
