import type { ExtractedEvidence } from "./types";

export interface ConfidenceEvaluation {
  confidenceScore: number; // 0 - 100
  sourceCount: number;
  evidenceCount: number;
  directEvidenceCount: number;
  breakdown: {
    sourceQualityPoints: number;
    sourceDiversityPoints: number;
    evidenceStrengthPoints: number;
    recencyPoints: number;
  };
  meetsThreshold: boolean;
  explanation: string;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 60; // 60% minimum confidence

/**
 * Calculate research confidence based on evidence signals.
 * CRITICAL RULE: AI interpretation is NOT evidence and does NOT increase confidence!
 */
export function calculateResearchConfidence(
  evidenceList: ExtractedEvidence[],
  minThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): ConfidenceEvaluation {
  if (!evidenceList || evidenceList.length === 0) {
    return {
      confidenceScore: 0,
      sourceCount: 0,
      evidenceCount: 0,
      directEvidenceCount: 0,
      breakdown: {
        sourceQualityPoints: 0,
        sourceDiversityPoints: 0,
        evidenceStrengthPoints: 0,
        recencyPoints: 0,
      },
      meetsThreshold: false,
      explanation: "No evidence found. Confidence is 0%.",
    };
  }

  // 1. Source diversity (unique domains or sources)
  const uniqueSources = new Set(evidenceList.map((e) => e.source_name.toLowerCase()));
  const sourceCount = uniqueSources.size;
  let sourceDiversityPoints = 0;
  if (sourceCount >= 3) {
    sourceDiversityPoints = 35;
  } else if (sourceCount === 2) {
    sourceDiversityPoints = 25;
  } else {
    sourceDiversityPoints = 15;
  }

  // 2. Source quality & nature
  let sourceQualityPoints = 0;
  let directEvidenceCount = 0;

  for (const item of evidenceList) {
    // AI interpretation explicitly contributes 0 to confidence!
    if (item.evidence_nature === "AI_INTERPRETATION") {
      continue;
    }

    if (item.evidence_nature === "DIRECT") {
      directEvidenceCount++;
      if (item.source_quality === "PRIMARY") {
        sourceQualityPoints += 15;
      } else if (item.source_quality === "SECONDARY") {
        sourceQualityPoints += 8;
      } else {
        sourceQualityPoints += 3;
      }
    } else if (item.evidence_nature === "INFERRED") {
      sourceQualityPoints += 5;
    }
  }
  // Cap quality points at 35
  sourceQualityPoints = Math.min(sourceQualityPoints, 35);

  // 3. Evidence Strength
  let evidenceStrengthPoints = 0;
  for (const item of evidenceList) {
    if (item.evidence_nature === "AI_INTERPRETATION") continue;
    if (item.evidence_strength === "HIGH") evidenceStrengthPoints += 8;
    else if (item.evidence_strength === "MEDIUM") evidenceStrengthPoints += 4;
    else evidenceStrengthPoints += 1;
  }
  evidenceStrengthPoints = Math.min(evidenceStrengthPoints, 20);

  // 4. Base baseline for verified public sources
  const recencyPoints = 10;

  const total = Math.min(
    100,
    sourceDiversityPoints + sourceQualityPoints + evidenceStrengthPoints + recencyPoints
  );

  const meetsThreshold = total >= minThreshold;

  let explanation = `Confidence ${total}%: ${sourceCount} independent source(s), ${directEvidenceCount} direct evidence item(s).`;
  if (!meetsThreshold) {
    explanation += ` Below ${minThreshold}% threshold. Needs more corroborating sources before testing.`;
  }

  return {
    confidenceScore: total,
    sourceCount,
    evidenceCount: evidenceList.length,
    directEvidenceCount,
    breakdown: {
      sourceQualityPoints,
      sourceDiversityPoints,
      evidenceStrengthPoints,
      recencyPoints,
    },
    meetsThreshold,
    explanation,
  };
}

/**
 * Autonomous Decision Precondition:
 * A candidate may only proceed to TEST if:
 * 1. overall_score >= 80
 * 2. research_confidence >= minConfidence (default 60%)
 * 3. zero_cost_score >= 50
 *
 * Otherwise returns RESEARCH_MORE or REJECT.
 */
export function evaluateAutonomousReadiness(options: {
  overallScore: number;
  researchConfidence: number;
  zeroCostScore: number;
  minConfidence?: number;
}): {
  decision: "TEST" | "RESEARCH_MORE" | "REJECT";
  readyForTest: boolean;
  reason: string;
} {
  const minConf = options.minConfidence ?? DEFAULT_CONFIDENCE_THRESHOLD;

  if (options.overallScore < 60) {
    return {
      decision: "REJECT",
      readyForTest: false,
      reason: `Overall score (${options.overallScore}) is below 60 threshold. Rejected.`,
    };
  }

  if (options.researchConfidence < minConf) {
    return {
      decision: "RESEARCH_MORE",
      readyForTest: false,
      reason: `Research confidence (${options.researchConfidence}%) is below required ${minConf}% threshold. More evidence required.`,
    };
  }

  if (options.zeroCostScore < 50) {
    return {
      decision: "RESEARCH_MORE",
      readyForTest: false,
      reason: `Zero-cost score (${options.zeroCostScore}) is below 50. Testing requires money and cannot be autonomously launched without human approval.`,
    };
  }

  if (options.overallScore >= 80) {
    return {
      decision: "TEST",
      readyForTest: true,
      reason: `Opportunity scored ${options.overallScore}/100 with ${options.researchConfidence}% research confidence and ₹0 testing feasibility. Ready for TEST.`,
    };
  }

  return {
    decision: "RESEARCH_MORE",
    readyForTest: false,
    reason: `Overall score (${options.overallScore}) qualifies for research refinement (60–79).`,
  };
}
