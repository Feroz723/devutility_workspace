export interface PriorityInput {
  validation_score: number;
  overall_score: number;
  research_confidence: number;
  monetization_score?: number | null;
  zero_cost_score?: number | null;
  evidence_count?: number | null;
  source_count?: number | null;
  risk_level?: string | null;
}

export function calculatePriorityScore(input: PriorityInput): number {
  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

  const valScore = clamp(input.validation_score);
  const ovScore = clamp(input.overall_score);
  const conf = clamp(input.research_confidence);
  const monScore = clamp(input.monetization_score ?? 50);
  const zcScore = clamp(input.zero_cost_score ?? 50);

  // Base weighted score
  let score =
    valScore * 0.40 +
    ovScore * 0.25 +
    conf * 0.15 +
    monScore * 0.10 +
    zcScore * 0.10;

  // Bonus for multiple corroborated sources
  if ((input.source_count ?? 0) >= 2) {
    score += 5;
  }

  // Bonus for rich direct evidence
  if ((input.evidence_count ?? 0) >= 3) {
    score += 3;
  }

  // Penalties for elevated risk
  const risk = (input.risk_level || "low").toLowerCase();
  if (risk === "critical") {
    score -= 30;
  } else if (risk === "high") {
    score -= 15;
  }

  return clamp(score);
}
