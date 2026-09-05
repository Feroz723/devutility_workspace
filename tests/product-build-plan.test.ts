import { describe, it, expect } from "vitest";
import { createBuildPlan } from "@/product-builder/build-plan";
import { generateProductSpecification } from "@/product-builder/spec";
import { deriveProductStrategy } from "@/product-builder/strategy";
import type { Experiment } from "@/types/experiment";

describe("Product Build Plan (DAG Tasks)", () => {
  it("creates an ordered sequence of DAG tasks with dependencies", () => {
    const exp: Experiment = {
      id: "exp-plan",
      title: "JSON to CSV Converter",
      description: "Convert JSON arrays to CSV format",
    } as any;

    const strategy = deriveProductStrategy(exp, null);
    const spec = generateProductSpecification(strategy, exp, null);
    const plan = createBuildPlan(spec);

    expect(plan.product_slug).toBe("json-to-csv-converter");
    expect(plan.tasks.length).toBe(7);
    expect(plan.zero_cost_verified).toBe(true);

    // Verify task ordering & dependencies
    const schemaTask = plan.tasks.find((t) => t.type === "SCHEMA");
    const repoTask = plan.tasks.find((t) => t.type === "REPOSITORY");
    const uiTask = plan.tasks.find((t) => t.type === "UI");
    const testTask = plan.tasks.find((t) => t.type === "TEST");

    expect(schemaTask).toBeDefined();
    expect(repoTask?.dependencies).toContain(schemaTask?.id);
    expect(uiTask?.dependencies).toContain(repoTask?.id);
    expect(testTask?.dependencies).toBeDefined();
  });
});
