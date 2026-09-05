import { describe, it, expect } from "vitest";
import {
  calculateValidationScore,
  VALIDATION_WEIGHTS,
} from "@/validation/scoring";

describe("Validation Engine — 8-Category Scoring", () => {
  it("verifies all 8 category weights sum up to exactly 1.0 (100%)", () => {
    const sum =
      VALIDATION_WEIGHTS.problem_severity +
      VALIDATION_WEIGHTS.demand_evidence +
      VALIDATION_WEIGHTS.evidence_strength +
      VALIDATION_WEIGHTS.willingness_to_pay +
      VALIDATION_WEIGHTS.customer_clarity +
      VALIDATION_WEIGHTS.mvp_feasibility +
      VALIDATION_WEIGHTS.distribution_feasibility +
      VALIDATION_WEIGHTS.zero_cost_feasibility;

    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("calculates high validation score correctly", () => {
    const input = {
      problem_severity: 85,
      demand_evidence: 90,
      evidence_strength: 80,
      willingness_to_pay: 85,
      customer_clarity: 90,
      mvp_feasibility: 80,
      distribution_feasibility: 85,
      zero_cost_feasibility: 90,
    };

    const { total_score, categories } = calculateValidationScore(input);

    // Expected:
    // 85*0.15 = 12.75
    // 90*0.20 = 18.0
    // 80*0.15 = 12.0
    // 85*0.15 = 12.75
    // 90*0.10 = 9.0
    // 80*0.10 = 8.0
    // 85*0.05 = 4.25
    // 90*0.10 = 9.0
    // Sum = 12.75 + 18 + 12 + 12.75 + 9 + 8 + 4.25 + 9 = 85.75 -> 86
    expect(total_score).toBe(86);
    expect(categories).toHaveLength(8);
    expect(categories[0]!.category).toBe("Problem Severity");
    expect(categories[0]!.weighted_score).toBeCloseTo(12.75);
  });

  it("clamps out-of-bounds input values to [0, 100]", () => {
    const input = {
      problem_severity: 150,
      demand_evidence: -20,
      evidence_strength: 100,
      willingness_to_pay: 0,
      customer_clarity: 50,
      mvp_feasibility: 50,
      distribution_feasibility: 50,
      zero_cost_feasibility: 50,
    };

    const { total_score, categories } = calculateValidationScore(input);
    expect(total_score).toBeGreaterThanOrEqual(0);
    expect(total_score).toBeLessThanOrEqual(100);

    const severity = categories.find((c) => c.category === "Problem Severity");
    expect(severity?.score).toBe(100);

    const demand = categories.find((c) => c.category === "Demand Evidence");
    expect(demand?.score).toBe(0);
  });

  it("produces explanatory rationales for all categories", () => {
    const input = {
      problem_severity: 90,
      demand_evidence: 40,
      evidence_strength: 75,
      willingness_to_pay: 85,
      customer_clarity: 90,
      mvp_feasibility: 85,
      distribution_feasibility: 85,
      zero_cost_feasibility: 90,
    };

    const { categories } = calculateValidationScore(input);
    for (const cat of categories) {
      expect(cat.rationale).toBeDefined();
      expect(cat.rationale.length).toBeGreaterThan(10);
    }
  });
});
