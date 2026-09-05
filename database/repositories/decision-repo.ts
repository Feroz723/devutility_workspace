import { queryOne, queryMany } from "../client";
import type { ScoringFactor } from "@/decision-engine/scoring";

interface DecisionRow {
  id: string;
  opportunity_id: string;
  overall_score: number;
  decision: string;
  reasoning: string | null;
  requires_spend: boolean;
  spend_override_blocked: boolean;
  decided_by: string;
  created_at: string;
}

export async function saveDecision(input: {
  opportunity_id: string;
  overall_score: number;
  decision: string;
  reasoning?: string;
  requires_spend?: boolean;
  spend_override_blocked?: boolean;
  decided_by?: string;
}): Promise<DecisionRow> {
  const row = await queryOne<DecisionRow>(
    `INSERT INTO decisions (
      opportunity_id, overall_score, decision, reasoning,
      requires_spend, spend_override_blocked, decided_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      input.opportunity_id,
      input.overall_score,
      input.decision,
      input.reasoning ?? null,
      input.requires_spend ?? false,
      input.spend_override_blocked ?? false,
      input.decided_by ?? "system",
    ]
  );
  return row!;
}

export async function saveDecisionFactors(
  decision_id: string,
  factors: ScoringFactor[]
): Promise<void> {
  for (const factor of factors) {
    await queryOne(
      `INSERT INTO decision_factors (
        decision_id, factor_name, raw_score, weight, weighted_score, notes
      ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        decision_id,
        factor.factor_name,
        factor.raw_score,
        factor.weight,
        factor.weighted_score,
        factor.notes ?? null,
      ]
    );
  }
}

export async function getDecisionsByOpportunity(opportunity_id: string): Promise<DecisionRow[]> {
  return queryMany<DecisionRow>(
    "SELECT * FROM decisions WHERE opportunity_id = $1 ORDER BY created_at DESC",
    [opportunity_id]
  );
}

export async function getDecisionFactors(decision_id: string) {
  return queryMany(
    "SELECT * FROM decision_factors WHERE decision_id = $1 ORDER BY factor_name",
    [decision_id]
  );
}
