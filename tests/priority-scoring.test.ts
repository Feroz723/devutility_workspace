import { describe, it, expect } from "vitest";
import { calculatePriorityScore } from "@/validation/priority";

describe("Validation Engine — Priority Ranking", () => {
  it("computes high priority score for validated candidate", () => {
    const score = calculatePriorityScore({
      validation_score: 85,
      overall_score: 88,
      research_confidence: 80,
      monetization_score: 80,
      zero_cost_score: 90,
      source_count: 3,
      evidence_count: 4,
      risk_level: "low",
    });

    // 85*0.4=34, 88*0.25=22, 80*0.15=12, 80*0.1=8, 90*0.1=9 -> 85
    // +5 for 3 sources, +3 for 4 evidence -> 93
    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("applies penalty for critical risk", () => {
    const lowRiskScore = calculatePriorityScore({
      validation_score: 80,
      overall_score: 80,
      research_confidence: 70,
      risk_level: "low",
    });

    const critRiskScore = calculatePriorityScore({
      validation_score: 80,
      overall_score: 80,
      research_confidence: 70,
      risk_level: "critical",
    });

    expect(critRiskScore).toBeLessThan(lowRiskScore);
    expect(lowRiskScore - critRiskScore).toBeGreaterThanOrEqual(25);
  });
});
