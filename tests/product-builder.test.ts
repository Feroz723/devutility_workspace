import { describe, it, expect, vi } from "vitest";
import { executeProductBuild } from "@/product-builder/builder";
import { createBuildPlan } from "@/product-builder/build-plan";
import { generateProductSpecification } from "@/product-builder/spec";
import { deriveProductStrategy } from "@/product-builder/strategy";
import { DeterministicTemplateProvider } from "@/product-builder/ai-provider";
import type { Product } from "@/types/product";
import type { Experiment } from "@/types/experiment";

// Mock repositories so test runs without needing a live postgres connection
vi.mock("@/database/repositories/product-repo", () => ({
  createProductBuildJob: vi.fn().mockResolvedValue({ id: "job-123", status: "IN_PROGRESS" }),
  updateProductBuildJob: vi.fn().mockResolvedValue({ id: "job-123", status: "COMPLETED" }),
  createProductBuildEvent: vi.fn().mockResolvedValue({ id: "ev-123" }),
  createProductArtifact: vi.fn().mockResolvedValue({ id: "art-123" }),
  createProductVersion: vi.fn().mockResolvedValue({ id: "ver-123", version: "1.0.0" }),
  updateProduct: vi.fn().mockResolvedValue({ id: "prod-123", status: "READY_FOR_REVIEW" }),
}));

vi.mock("@/database/repositories/audit-repo", () => ({
  logAudit: vi.fn().mockResolvedValue({ id: "audit-123" }),
}));

describe("End-to-End Autonomous Product Builder", () => {
  const exp: Experiment = {
    id: "exp-builder-test",
    title: "SVG Path Visualizer",
    description: "Inspect and optimize SVG path curves",
    status: "COMPLETED",
    result: "WINNER",
    cost_inr: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  const mockProduct: Product = {
    id: "prod-123",
    slug: "svg-path-visualizer",
    name: "SVG Path Visualizer",
    description: "Instant SVG path viewer",
    problem: "Hard to debug SVG curves",
    solution: "Interactive browser visualizer",
    value_proposition: "Debug SVG paths in real time",
    product_type: "FREE_TOOL",
    status: "DRAFT",
    build_status: "NOT_STARTED",
    estimated_cost_inr: 0,
    actual_cost_inr: 0,
    cost_classification: "ZERO_COST",
    version: "1.0.0",
    sales_count: 0,
    revenue: 0,
    currency: "INR",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Product;

  it("executes build tasks, generates artifacts, and achieves READY status", async () => {
    const strategy = deriveProductStrategy(exp, null);
    const spec = generateProductSpecification(strategy, exp, null);
    const plan = createBuildPlan(spec, mockProduct.id);

    const result = await executeProductBuild(
      {
        product: mockProduct,
        specification: spec,
        buildPlan: plan,
        jobId: "job-test-uuid",
      },
      new DeterministicTemplateProvider()
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe("READY");
    expect(result.artifacts_created).toBeGreaterThanOrEqual(7);
    expect(result.quality_report.overall_passed).toBe(true);
    expect(result.quality_report.overall_score).toBeGreaterThanOrEqual(90);
  });
});
