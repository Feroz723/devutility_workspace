import { describe, it, expect } from "vitest";
import { generateProductSpecification } from "@/product-builder/spec";
import { deriveProductStrategy } from "@/product-builder/strategy";
import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";

describe("7-Part Product Specification Generation", () => {
  const exp: Experiment = {
    id: "exp-test",
    title: "SQL Formatter Experiment",
    description: "Format SQL queries client-side",
  } as any;

  const opp: Opportunity = {
    id: "opp-test",
    title: "SQL Formatter Tool",
    target_audience: "Data analysts and backend engineers",
    problem_statement: "Messy queries make debugging slow",
    value_proposition: "Format SQL queries in 1 click without data leaving the browser",
  } as any;

  it("generates a complete 7-section specification", () => {
    const strategy = deriveProductStrategy(exp, opp);
    const spec = generateProductSpecification(strategy, exp, opp);

    // Section 1: Identity
    expect(spec.identity.name).toBe("SQL Formatter Tool");
    expect(spec.identity.slug).toBe("sql-formatter-tool");
    expect(spec.identity.version).toBe("1.0.0");
    expect(spec.identity.product_type).toBe("DEVELOPER_TOOL");

    // Section 2: Problem & Solution
    expect(spec.problem_solution.validated_problem).toBe("Messy queries make debugging slow");
    expect(spec.problem_solution.target_audience).toBe("Data analysts and backend engineers");

    // Section 3: Scope & Non-Goals
    expect(spec.scope.mvp_features.length).toBeGreaterThan(0);
    expect(spec.scope.explicit_non_goals.length).toBeGreaterThan(0);

    // Section 4: Requirements
    expect(spec.requirements.user_inputs.length).toBeGreaterThan(0);
    expect(spec.requirements.user_outputs.length).toBeGreaterThan(0);
    expect(spec.requirements.error_handling.length).toBeGreaterThan(0);

    // Section 5: Architecture
    expect(spec.architecture.backend_type).toBe("NONE_CLIENT_ONLY");
    expect(spec.architecture.zero_cost_verification).toContain("₹0 cost");

    // Section 6: UI Design
    expect(spec.ui_design.layout_type).toBe("SINGLE_PAGE_TOOL");
    expect(spec.ui_design.primary_actions).toContain("Generate / Run");

    // Section 7: Delivery
    expect(spec.delivery.delivery_type).toBe("CLI");
    expect(spec.delivery.run_instructions).toContain("npm run dev");
  });
});
