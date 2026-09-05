import { describe, it, expect } from "vitest";
import {
  calculateOverallScore,
  determineDecision,
  scoreOpportunity,
  SCORING_WEIGHTS,
  DECISION_THRESHOLDS,
} from "@/decision-engine/scoring";

describe("Decision Engine — Scoring", () => {
  it("verifies scoring weights sum up to 1.0 (100%)", () => {
    const sum =
      SCORING_WEIGHTS.demand +
      SCORING_WEIGHTS.competition +
      SCORING_WEIGHTS.monetization +
      SCORING_WEIGHTS.automation +
      SCORING_WEIGHTS.zero_cost;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("calculates high scores correctly (qualifying for TEST)", () => {
    // demand: 90*0.25=22.5
    // comp: (100-20)*0.15=80*0.15=12
    // mon: 85*0.25=21.25
    // auto: 90*0.15=13.5
    // zero: 85*0.20=17
    // Total = 22.5 + 12 + 21.25 + 13.5 + 17 = 86.25 -> 86
    const input = {
      demand_score: 90,
      competition_score: 20,
      monetization_score: 85,
      automation_score: 90,
      zero_cost_score: 85,
    };
    const score = calculateOverallScore(input);
    expect(score).toBe(86);
    expect(determineDecision(score)).toBe("TEST");

    const result = scoreOpportunity(input);
    expect(result.overall_score).toBe(86);
    expect(result.decision).toBe("TEST");
    expect(result.requires_spend_review).toBe(false);
  });

  it("calculates medium scores correctly (RESEARCH_MORE)", () => {
    // demand: 70*0.25=17.5
    // comp: (100-40)*0.15=60*0.15=9
    // mon: 70*0.25=17.5
    // auto: 70*0.15=10.5
    // zero: 70*0.20=14
    // Total = 17.5 + 9 + 17.5 + 10.5 + 14 = 68.5 -> 69
    const input = {
      demand_score: 70,
      competition_score: 40,
      monetization_score: 70,
      automation_score: 70,
      zero_cost_score: 70,
    };
    const score = calculateOverallScore(input);
    expect(score).toBe(69);
    expect(determineDecision(score)).toBe("RESEARCH_MORE");

    const result = scoreOpportunity(input);
    expect(result.decision).toBe("RESEARCH_MORE");
  });

  it("calculates low scores correctly (REJECT)", () => {
    const input = {
      demand_score: 30,
      competition_score: 80,
      monetization_score: 40,
      automation_score: 30,
      zero_cost_score: 40,
    };
    const score = calculateOverallScore(input);
    expect(score).toBeLessThan(60);
    expect(determineDecision(score)).toBe("REJECT");

    const result = scoreOpportunity(input);
    expect(result.decision).toBe("REJECT");
  });

  it("handles inverse competition scoring correctly", () => {
    const lowCompetitionInput = {
      demand_score: 80,
      competition_score: 10, // low competition is favorable
      monetization_score: 80,
      automation_score: 80,
      zero_cost_score: 80,
    };
    const highCompetitionInput = {
      demand_score: 80,
      competition_score: 90, // high competition is unfavorable
      monetization_score: 80,
      automation_score: 80,
      zero_cost_score: 80,
    };

    const lowCompScore = calculateOverallScore(lowCompetitionInput);
    const highCompScore = calculateOverallScore(highCompetitionInput);

    expect(lowCompScore).toBeGreaterThan(highCompScore);
    // Difference is (90 - 10) * 0.15 = 12 points
    expect(lowCompScore - highCompScore).toBe(12);
  });

  it("downgrades TEST to RESEARCH_MORE if zero-cost score is under 50", () => {
    // High overall score but zero_cost_score is 40
    // demand: 100*0.25=25
    // comp: (100-0)*0.15=15
    // mon: 100*0.25=25
    // auto: 100*0.15=15
    // zero: 40*0.20=8
    // Total = 25+15+25+15+8 = 88 (qualifies for TEST)
    const input = {
      demand_score: 100,
      competition_score: 0,
      monetization_score: 100,
      automation_score: 100,
      zero_cost_score: 40, // Below 50
    };

    const overallScore = calculateOverallScore(input);
    expect(overallScore).toBe(88);
    expect(overallScore).toBeGreaterThanOrEqual(DECISION_THRESHOLDS.TEST);

    const result = scoreOpportunity(input);
    expect(result.overall_score).toBe(88);
    expect(result.requires_spend_review).toBe(true);
    expect(result.decision).toBe("RESEARCH_MORE"); // Downgraded due to zero-spend guard
  });

  it("handles boundary values 0 and 100", () => {
    const minimum = {
      demand_score: 0,
      competition_score: 100, // effective is 0
      monetization_score: 0,
      automation_score: 0,
      zero_cost_score: 0,
    };
    expect(calculateOverallScore(minimum)).toBe(0);
    expect(determineDecision(0)).toBe("REJECT");

    const maximum = {
      demand_score: 100,
      competition_score: 0, // effective is 100
      monetization_score: 100,
      automation_score: 100,
      zero_cost_score: 100,
    };
    expect(calculateOverallScore(maximum)).toBe(100);
    expect(determineDecision(100)).toBe("TEST");
  });
});
