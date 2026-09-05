import { describe, it, expect } from "vitest";
import { generateChannelContent } from "@/distribution/content-engine";
import type { Product } from "@/types/product";

describe("Content Generation with Strict Fact/Inference/Marketing Separation", () => {
  const product: Product = {
    id: "44444444-4444-4444-4444-444444444444",
    name: "CSV Deduplicator",
    slug: "csv-deduplicator",
    description: "In-browser duplicate row remover for large datasets.",
    problem: "Excel crashes on 50MB CSV files when removing duplicates.",
    solution: "Fast streaming browser WebWorker deduplication tool.",
    value_proposition: "Deduplicate 100k rows in 2 seconds without cloud upload.",
    product_type: "FREE_TOOL",
    status: "READY",
    build_status: "READY",
    estimated_cost_inr: 0,
    actual_cost_inr: 0,
    cost_classification: "ZERO_COST",
    build_plan: {} as any,
    tech_stack: ["Web Workers", "PapaParse"],
    version: "1.2.0",
    learning_data: {},
    creation_status: "ready",
    publishing_status: "published",
    price: 0,
    currency: "INR",
    product_url: "https://csv-dedup.example.com",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  it("strictly categorizes fact claims, inferences, and copy", () => {
    const asset = generateChannelContent({
      product,
      channel_type: "HACKER_NEWS",
      content_type: "PRODUCT_ANNOUNCEMENT",
      target_audience: "Data analysts and developers",
      tracking_url: "https://csv-dedup.example.com?utm_source=hackernews",
      canonical_url: "https://csv-dedup.example.com",
    });

    expect(asset.title).toContain("Show HN");
    expect(asset.body).toBeDefined();

    // Facts must be explicitly declared
    expect(asset.fact_claims.length).toBeGreaterThan(0);
    expect(asset.fact_claims.some((f) => f.includes("CSV Deduplicator"))).toBe(true);
    expect(asset.fact_claims.some((f) => f.includes("₹0"))).toBe(true);

    // Inferences must be tracked
    expect(asset.inference_notes.length).toBeGreaterThan(0);

    // Marketing copy must be separated
    expect(asset.marketing_copy.length).toBeGreaterThan(0);

    // UTM link included
    expect(asset.tracking_url).toContain("utm_source=hackernews");
  });

  it("creates clean GitHub README format for GITHUB_README content type", () => {
    const asset = generateChannelContent({
      product,
      channel_type: "GITHUB",
      content_type: "GITHUB_README",
      target_audience: "Open source contributors",
    });

    expect(asset.body).toContain("# CSV Deduplicator");
    expect(asset.body).toContain("## Quickstart");
    expect(asset.body).toContain("MIT");
  });
});
