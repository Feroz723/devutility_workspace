import { describe, it, expect } from "vitest";
import {
  calculateResearchConfidence,
  evaluateAutonomousReadiness,
} from "@/research/confidence";
import type { ExtractedEvidence } from "@/research/types";

describe("Research Confidence & Autonomous Decision Preconditions", () => {
  it("treats AI interpretation as NOT increasing direct evidence confidence", () => {
    const aiOnlyEvidence: ExtractedEvidence[] = [
      {
        source_type: "ai_summary",
        source_name: "LLM Hallucination",
        source_url: "internal://ai",
        evidence_text: "According to my analysis, 95% of small businesses will pay ₹5,000 for this tool.",
        evidence_strength: "HIGH",
        evidence_nature: "AI_INTERPRETATION", // AI speculation is NOT evidence
        source_quality: "LOWER_CONFIDENCE",
      },
    ];

    const result = calculateResearchConfidence(aiOnlyEvidence);
    // Direct evidence count must be 0 and confidence score should be low (< 35)
    expect(result.directEvidenceCount).toBe(0);
    expect(result.breakdown.sourceQualityPoints).toBe(0);
    expect(result.breakdown.evidenceStrengthPoints).toBe(0);
    expect(result.confidenceScore).toBeLessThan(40);
  });

  it("yields high confidence when multiple independent primary sources corroborate the pain", () => {
    const robustEvidence: ExtractedEvidence[] = [
      {
        source_type: "hacker_news",
        source_name: "Hacker News",
        source_url: "https://news.ycombinator.com/item?id=1",
        evidence_text: "We struggle with invoice sync every single month.",
        evidence_strength: "HIGH",
        evidence_nature: "DIRECT",
        source_quality: "PRIMARY",
      },
      {
        source_type: "github",
        source_name: "GitHub Issues",
        source_url: "https://github.com/org/repo/issues/2",
        evidence_text: "Feature request: automated reconciliation export",
        evidence_strength: "HIGH",
        evidence_nature: "DIRECT",
        source_quality: "PRIMARY",
      },
      {
        source_type: "reddit",
        source_name: "r/smallbusiness",
        source_url: "https://reddit.com/r/smallbusiness/3",
        evidence_text: "Does anyone have an alternative to manual data entry for QuickBooks?",
        evidence_strength: "MEDIUM",
        evidence_nature: "DIRECT",
        source_quality: "PRIMARY",
      },
    ];

    const result = calculateResearchConfidence(robustEvidence);
    expect(result.sourceCount).toBe(3);
    expect(result.directEvidenceCount).toBe(3);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
    expect(result.meetsThreshold).toBe(true);
  });

  it("demotes opportunity to RESEARCH_MORE if overall score is 85 but confidence is only 30%", () => {
    // High score but low research confidence
    const readiness = evaluateAutonomousReadiness({
      overallScore: 85,
      researchConfidence: 30, // Below 60% threshold
      zeroCostScore: 90,
      minConfidence: 60,
    });

    expect(readiness.decision).toBe("RESEARCH_MORE");
    expect(readiness.readyForTest).toBe(false);
    expect(readiness.reason).toContain("Research confidence (30%) is below required 60% threshold");
  });

  it("allows autonomous progression to TEST when score >= 80, confidence >= 60%, and zero-cost >= 50", () => {
    const readiness = evaluateAutonomousReadiness({
      overallScore: 85,
      researchConfidence: 80,
      zeroCostScore: 90,
      minConfidence: 60,
    });

    expect(readiness.decision).toBe("TEST");
    expect(readiness.readyForTest).toBe(true);
    expect(readiness.reason).toContain("Ready for TEST");
  });

  it("demotes opportunity to RESEARCH_MORE if required startup cost is high even with 95 score", () => {
    // Opportunity has 95 overall score and 85% confidence, but zero-cost feasibility is low (requires ₹10,000 upfront)
    const readiness = evaluateAutonomousReadiness({
      overallScore: 95,
      researchConfidence: 85,
      zeroCostScore: 30, // Below 50 means paid testing required
      minConfidence: 60,
    });

    expect(readiness.decision).toBe("RESEARCH_MORE");
    expect(readiness.readyForTest).toBe(false);
    expect(readiness.reason).toContain("Zero-cost score (30) is below 50");
  });

  it("rejects opportunities with score < 60 regardless of confidence", () => {
    const readiness = evaluateAutonomousReadiness({
      overallScore: 45,
      researchConfidence: 90,
      zeroCostScore: 95,
    });

    expect(readiness.decision).toBe("REJECT");
    expect(readiness.readyForTest).toBe(false);
  });
});
