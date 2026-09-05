import { describe, it, expect } from "vitest";
import { determineProductType, deriveProductStrategy } from "@/product-builder/strategy";
import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";

describe("Product Strategy and Scope Minimization", () => {
  it("determines FREE_TOOL for calculator and converter prompts", () => {
    const exp = {
      title: "Invoice and Tax Calculator",
      description: "Quick GST calculator tool",
    } as unknown as Experiment;
    expect(determineProductType(exp)).toBe("FREE_TOOL");
  });

  it("determines DEVELOPER_TOOL for CLI / SDK prompts", () => {
    const exp = {
      title: "Fast Git Changelog CLI",
      description: "A developer CLI tool to format git commits",
    } as unknown as Experiment;
    expect(determineProductType(exp)).toBe("DEVELOPER_TOOL");
  });

  it("derives anti-bloat scope with explicit non-goals and ₹0 cost", () => {
    const exp = {
      id: "exp-1",
      title: "Regex Helper Tool",
      description: "Helps users test regular expressions interactively",
    } as unknown as Experiment;

    const opp = {
      id: "opp-1",
      title: "Interactive Regex Helper",
      target_audience: "Web developers",
      problem_statement: "Regex is hard to visualize",
      value_proposition: "Instant visual feedback",
    } as unknown as Opportunity;

    const strategy = deriveProductStrategy(exp, opp);

    expect(strategy.product_type).toBe("DEVELOPER_TOOL");
    expect(strategy.estimated_cost_inr).toBe(0);
    expect(strategy.scope_minimization.core_features.length).toBeGreaterThan(0);
    expect(strategy.scope_minimization.explicit_non_goals).toContain(
      "No user authentication or password management (v1 is frictionless)"
    );
    expect(strategy.scope_minimization.explicit_non_goals).toContain(
      "No payment processing or subscriptions (strictly ₹0 in Phase 6)"
    );
  });
});
