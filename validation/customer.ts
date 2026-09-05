import { CustomerProfile, PersonaPainPoint } from "./types";

interface CustomerInput {
  target_customer?: string | null;
  target_market?: string | null;
  problem?: string | null;
  problem_statement?: string | null;
  evidence?: Array<{ quote?: string; evidence_text?: string; source?: string }> | null;
}

export function buildCustomerProfile(input: CustomerInput): CustomerProfile {
  const painPoints: PersonaPainPoint[] = [];
  const rawEvidence = input.evidence || [];

  // 1. Extract evidence-backed pain points from primary quotes
  for (const ev of rawEvidence) {
    const text = (ev.quote || ev.evidence_text || "").trim();
    if (text.length > 15) {
      painPoints.push({
        pain: text.length > 180 ? text.slice(0, 177) + "..." : text,
        intensity: /critical|down|blocked|broken|urgent|money|loss/i.test(text) ? "CRITICAL" : "MODERATE",
        nature: "EVIDENCE",
        source_snippet: ev.source ? `From ${ev.source}` : undefined,
      });
    }
    if (painPoints.length >= 3) break;
  }

  // 2. Add inferred pain points from problem description if needed
  if (painPoints.length === 0 && (input.problem || input.problem_statement)) {
    const desc = input.problem || input.problem_statement || "";
    painPoints.push({
      pain: desc.length > 180 ? desc.slice(0, 177) + "..." : desc,
      intensity: "MODERATE",
      nature: "INFERENCE",
    });
  }

  // Fallback if none exists
  if (painPoints.length === 0) {
    painPoints.push({
      pain: "Inefficient manual workflows and lack of specialized tooling.",
      intensity: "MODERATE",
      nature: "INFERENCE",
    });
  }

  const targetSegment = input.target_customer || "Software Developers & Technical Operators";
  const market = input.target_market || "B2B SaaS / DevTools";

  // Determine budget capacity
  let budgetCapacity: CustomerProfile["budget_capacity"] = "SMB";
  const marketLower = (targetSegment + " " + market).toLowerCase();
  if (/enterprise|corporate|compliance|fintech/i.test(marketLower)) {
    budgetCapacity = "ENTERPRISE";
  } else if (/consumer|hobbyist|student/i.test(marketLower)) {
    budgetCapacity = "FREE_ONLY";
  } else if (/freelancer|creator|solopreneur|individual/i.test(marketLower)) {
    budgetCapacity = "PROSUMER";
  }

  // Calculate customer clarity score based on specifics
  let clarityScore = 50;
  if (input.target_customer && input.target_customer.length > 10) clarityScore += 20;
  if (input.target_market && input.target_market.length > 5) clarityScore += 15;
  if (painPoints.some((p) => p.nature === "EVIDENCE")) clarityScore += 15;
  clarityScore = Math.min(95, clarityScore);

  return {
    target_segment: targetSegment,
    archetype: `${targetSegment} in ${market}`,
    pain_points: painPoints,
    daily_workflow: `Manually managing and orchestrating workflows within ${market}, currently experiencing bottlenecks.`,
    trigger_event: `A critical operational breakdown, repetitive frustration, or missed deadline that forces them to search for a dedicated solution.`,
    budget_capacity: budgetCapacity,
    clarity_score: clarityScore,
  };
}
