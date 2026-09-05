import type { Opportunity } from "@/types/opportunity";
import type { CandidateOpportunity, ExtractedEvidence } from "./types";

/**
 * Tokenize and normalize a string for semantic similarity comparison.
 */
export function normalizeText(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Calculate Jaccard similarity between two token lists.
 */
export function calculateTokenOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

export interface MatchResult {
  isDuplicate: boolean;
  matchedOpportunity?: Opportunity;
  similarityScore: number;
  matchReason?: string;
}

/**
 * Check if a candidate opportunity already exists in the provided list of opportunities.
 */
export function findExistingDuplicate(
  candidate: CandidateOpportunity,
  existingList: Opportunity[],
  threshold: number = 0.45
): MatchResult {
  const candidateTitleTokens = normalizeText(candidate.title);
  const candidateProblemTokens = normalizeText(candidate.problem);
  const candidateUrls = new Set(candidate.evidence.map((e) => e.source_url.toLowerCase()));

  for (const opp of existingList) {
    // 1. Check exact source URL overlap
    if (opp.source_url && candidateUrls.has(opp.source_url.toLowerCase())) {
      return {
        isDuplicate: true,
        matchedOpportunity: opp,
        similarityScore: 1.0,
        matchReason: `Exact source URL match: ${opp.source_url}`,
      };
    }

    // 2. Title similarity
    const oppTitleTokens = normalizeText(opp.title);
    const titleSimilarity = calculateTokenOverlap(candidateTitleTokens, oppTitleTokens);

    // 3. Problem statement similarity
    const oppProblemTokens = normalizeText(opp.problem || opp.problem_statement || "");
    const problemSimilarity = calculateTokenOverlap(candidateProblemTokens, oppProblemTokens);

    const overallSimilarity = titleSimilarity * 0.6 + problemSimilarity * 0.4;

    if (overallSimilarity >= threshold) {
      return {
        isDuplicate: true,
        matchedOpportunity: opp,
        similarityScore: overallSimilarity,
        matchReason: `High text overlap: ${(overallSimilarity * 100).toFixed(0)}%`,
      };
    }
  }

  return {
    isDuplicate: false,
    similarityScore: 0,
  };
}

/**
 * Merge new evidence with existing evidence, preventing duplicate evidence text/URLs.
 */
export function mergeEvidence(
  existingEvidence: ExtractedEvidence[],
  newEvidence: ExtractedEvidence[]
): {
  merged: ExtractedEvidence[];
  addedCount: number;
} {
  const seen = new Set(existingEvidence.map((e) => `${e.source_url}::${e.evidence_text.slice(0, 50)}`));
  const merged = [...existingEvidence];
  let addedCount = 0;

  for (const item of newEvidence) {
    const key = `${item.source_url}::${item.evidence_text.slice(0, 50)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
      addedCount++;
    }
  }

  return { merged, addedCount };
}
