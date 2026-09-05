import { describe, it, expect } from "vitest";
import { generateDistributionStrategy } from "@/distribution/strategy";
import type { Product } from "@/types/product";

describe("Deterministic Distribution Strategy Ranking", () => {
  const sampleProduct: Product = {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Markdown Resume Generator",
    slug: "markdown-resume-generator",
    description: "Converts clean markdown files into printable ATS-friendly PDFs.",
    problem: "Formatting resumes in Word is frustrating and fragile.",
    solution: "Instant client-side markdown to PDF compiler.",
    value_proposition: "Type in plain text, download styled resume in 5 seconds.",
    product_type: "FREE_TOOL",
    status: "READY",
    build_status: "READY",
    estimated_cost_inr: 0,
    actual_cost_inr: 0,
    cost_classification: "ZERO_COST",
    build_plan: {} as any,
    tech_stack: ["React", "Tailwind CSS", "LocalStorage"],
    version: "1.0.0",
    learning_data: {},
    creation_status: "ready",
    publishing_status: "published",
    price: 0,
    currency: "INR",
    product_url: "https://resume.example.com",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  it("produces a deterministic zero-cost ranked strategy plan", () => {
    const plan = generateDistributionStrategy(sampleProduct);

    expect(plan.product_id).toBe(sampleProduct.id);
    expect(plan.target_audience).toBeDefined();
    expect(plan.estimated_total_cost_inr).toBe(0);
    expect(plan.zero_cost_verified).toBe(true);
    expect(plan.ranked_channels.length).toBeGreaterThan(0);

    // Channels are sorted by score descending and priority is sequential
    for (let i = 0; i < plan.ranked_channels.length; i++) {
      expect(plan.ranked_channels[i]!.priority).toBe(i + 1);
      if (i > 0) {
        expect(plan.ranked_channels[i - 1]!.total_score).toBeGreaterThanOrEqual(
          plan.ranked_channels[i]!.total_score
        );
      }
    }
  });

  it("prioritizes owned website and developer communities for web utilities", () => {
    const plan = generateDistributionStrategy(sampleProduct);
    const topChannels = plan.ranked_channels.slice(0, 3).map((c) => c.channel_type);

    expect(topChannels).toContain("OWNED_WEBSITE");
  });
});
