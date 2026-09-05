import { describe, it, expect } from "vitest";
import { evaluateCandidate } from "@/decision-engine/evaluation";

describe("Decision Intelligence — Deterministic Preconditions & Decisions", () => {
  it("Case 1: Full Candidate — passes all 7 preconditions -> TEST_CANDIDATE", () => {
    const result = evaluateCandidate({
      overall_score: 85,
      research_confidence: 75,
      validation_score: 82,
      source_count: 3,
      direct_evidence_count: 2,
      zero_cost_score: 80,
      estimated_cost_inr: 0,
      risk_level: "low",
    });

    expect(result.decision).toBe("TEST_CANDIDATE");
    expect(result.validation_status).toBe("TEST_CANDIDATE");
    expect(result.preconditions.is_candidate).toBe(true);
    expect(result.preconditions.score_precondition).toBe(true);
    expect(result.preconditions.confidence_precondition).toBe(true);
    expect(result.preconditions.validation_precondition).toBe(true);
    expect(result.preconditions.source_count_precondition).toBe(true);
    expect(result.preconditions.direct_evidence_precondition).toBe(true);
    expect(result.preconditions.zero_cost_precondition).toBe(true);
    expect(result.preconditions.spend_policy_precondition).toBe(true);
    expect(result.preconditions.failure_reasons).toHaveLength(0);
    expect(result.explanation.why.length).toBeGreaterThan(0);
  });

  it("Case 2: Single source / 0 quotes -> RESEARCH_MORE even with high scores", () => {
    const result = evaluateCandidate({
      overall_score: 92,
      research_confidence: 85,
      validation_score: 88,
      source_count: 1, // Fails: requires >= 2
      direct_evidence_count: 0, // Fails: requires >= 1
      zero_cost_score: 90,
      estimated_cost_inr: 0,
    });

    expect(result.decision).toBe("RESEARCH_MORE");
    expect(result.validation_status).toBe("RESEARCHING");
    expect(result.preconditions.is_candidate).toBe(false);
    expect(result.preconditions.source_count_precondition).toBe(false);
    expect(result.preconditions.direct_evidence_precondition).toBe(false);
    expect(result.preconditions.failure_reasons.some((r) => r.includes("at least 2 independent"))).toBe(true);
    expect(result.explanation.next_action).toContain("Queue secondary research run");
  });

  it("Case 3: Confidence < 60% -> RESEARCH_MORE", () => {
    const result = evaluateCandidate({
      overall_score: 85,
      research_confidence: 45, // Fails: requires >= 60
      validation_score: 75,
      source_count: 2,
      direct_evidence_count: 2,
      zero_cost_score: 80,
      estimated_cost_inr: 0,
    });

    expect(result.decision).toBe("RESEARCH_MORE");
    expect(result.validation_status).toBe("RESEARCHING");
    expect(result.preconditions.confidence_precondition).toBe(false);
    expect(result.preconditions.failure_reasons.some((r) => r.includes("confidence (45%) is below"))).toBe(true);
  });

  it("Case 4: Required cost > ₹0 (e.g. ₹500 domain/ad spend) -> REQUIRES_APPROVAL", () => {
    const result = evaluateCandidate({
      overall_score: 88,
      research_confidence: 80,
      validation_score: 85,
      source_count: 3,
      direct_evidence_count: 2,
      zero_cost_score: 90,
      estimated_cost_inr: 500, // Non-zero cost triggers approval
    });

    expect(result.decision).toBe("REQUIRES_APPROVAL");
    expect(result.validation_status).toBe("REQUIRES_APPROVAL");
    expect(result.preconditions.is_candidate).toBe(false);
    expect(result.preconditions.zero_cost_precondition).toBe(false);
    expect(result.explanation.next_action).toContain("human operator for financial spend");
  });

  it("Case 5: Prohibited or malicious action -> BLOCKED", () => {
    const result = evaluateCandidate({
      overall_score: 95,
      research_confidence: 90,
      validation_score: 90,
      source_count: 4,
      direct_evidence_count: 5,
      zero_cost_score: 100,
      estimated_cost_inr: 0,
      action_type: "deceptive_scraping_and_spam",
    });

    expect(result.decision).toBe("BLOCKED");
    expect(result.validation_status).toBe("REJECTED");
    expect(result.preconditions.is_candidate).toBe(false);
    expect(result.preconditions.spend_policy_precondition).toBe(false);
    expect(result.explanation.next_action).toContain("Permanently blocked");
  });

  it("Case 6: Weak scores -> REJECT", () => {
    const result = evaluateCandidate({
      overall_score: 55,
      research_confidence: 70,
      validation_score: 50,
      source_count: 2,
      direct_evidence_count: 2,
      zero_cost_score: 80,
      estimated_cost_inr: 0,
    });

    expect(result.decision).toBe("REJECT");
    expect(result.validation_status).toBe("REJECTED");
    expect(result.preconditions.is_candidate).toBe(false);
  });
});
