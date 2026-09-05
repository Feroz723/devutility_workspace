import { describe, it, expect } from "vitest";
import { evaluateCandidate } from "@/decision-engine/evaluation";
import { canExecute } from "@/experiments/guard";

describe("Experiment Engine — Preconditions & Eligibility", () => {
  it("allows TEST_CANDIDATE with ₹0 cost to create an experiment", () => {
    const oppEvaluation = evaluateCandidate({
      overall_score: 85,
      research_confidence: 75,
      validation_score: 80,
      source_count: 2,
      direct_evidence_count: 2,
      zero_cost_score: 90,
      estimated_cost_inr: 0,
    });

    expect(oppEvaluation.decision).toBe("TEST_CANDIDATE");

    const guard = canExecute({
      title: "Self-service Webhook Logger",
      estimated_cost_inr: 0,
      experiment_type: "WAITLIST",
    });

    expect(guard.allowed).toBe(true);
    expect(guard.classification).toBe("FREE");
  });

  it("requires approval when estimated cost is ₹5000 (exceeds ₹0)", () => {
    const guard = canExecute({
      title: "Paid Google Ads Experiment",
      estimated_cost_inr: 5000,
      experiment_type: "LANDING_PAGE",
    });

    expect(guard.allowed).toBe(false);
    expect(guard.classification).toBe("REQUIRES_APPROVAL");
    expect(guard.requires_human_approval).toBe(true);
    expect(guard.reason).toContain("exceeds autonomous ₹0 policy");
  });

  it("rejects opportunities that need RESEARCH_MORE from automatic experiment creation", () => {
    const oppEvaluation = evaluateCandidate({
      overall_score: 88,
      research_confidence: 50, // Insufficient confidence
      validation_score: 75,
      source_count: 1, // Only 1 source
      direct_evidence_count: 0,
      zero_cost_score: 80,
      estimated_cost_inr: 0,
    });

    expect(oppEvaluation.decision).toBe("RESEARCH_MORE");
    expect(oppEvaluation.preconditions.is_candidate).toBe(false);
  });

  it("blocks prohibited actions (e.g. cold spamming, email scraping)", () => {
    const guard = canExecute({
      title: "Cold blast scraping and spam campaign",
      estimated_cost_inr: 0,
      experiment_type: "COMMUNITY_TEST",
    });

    expect(guard.allowed).toBe(false);
    expect(guard.classification).toBe("BLOCKED");
    expect(guard.reason).toContain("violates ethical operating guidelines");
  });
});
