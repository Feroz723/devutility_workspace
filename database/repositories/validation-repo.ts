import { queryOne, queryMany } from "../client";
import type { OpportunityDecision } from "@/types/opportunity";

export interface ValidationRunRow {
  id: string;
  opportunity_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  evidence_analyzed: number;
  sources_analyzed: number;
  validation_score: number | null;
  confidence: number | null;
  decision: OpportunityDecision;
  result: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function createValidationRun(input: {
  opportunity_id: string;
  evidence_analyzed?: number;
  sources_analyzed?: number;
  decision?: OpportunityDecision;
}): Promise<ValidationRunRow> {
  const row = await queryOne<ValidationRunRow>(
    `INSERT INTO validation_runs (
      opportunity_id, status, evidence_analyzed, sources_analyzed,
      decision, started_at
    ) VALUES ($1, 'RUNNING', $2, $3, $4, now())
    RETURNING *`,
    [
      input.opportunity_id,
      input.evidence_analyzed ?? 0,
      input.sources_analyzed ?? 0,
      input.decision ?? "RESEARCH_MORE",
    ]
  );
  return row!;
}

export async function updateValidationRun(
  id: string,
  update: {
    status?: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
    evidence_analyzed?: number;
    sources_analyzed?: number;
    validation_score?: number | null;
    confidence?: number | null;
    decision?: OpportunityDecision;
    result?: Record<string, unknown>;
    error?: string | null;
  }
): Promise<ValidationRunRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (update.status !== undefined) {
    sets.push(`status = $${idx++}`);
    params.push(update.status);
    if (update.status === "COMPLETED" || update.status === "FAILED") {
      sets.push(`completed_at = now()`);
    }
  }
  if (update.evidence_analyzed !== undefined) {
    sets.push(`evidence_analyzed = $${idx++}`);
    params.push(update.evidence_analyzed);
  }
  if (update.sources_analyzed !== undefined) {
    sets.push(`sources_analyzed = $${idx++}`);
    params.push(update.sources_analyzed);
  }
  if (update.validation_score !== undefined) {
    sets.push(`validation_score = $${idx++}`);
    params.push(update.validation_score);
  }
  if (update.confidence !== undefined) {
    sets.push(`confidence = $${idx++}`);
    params.push(update.confidence);
  }
  if (update.decision !== undefined) {
    sets.push(`decision = $${idx++}`);
    params.push(update.decision);
  }
  if (update.result !== undefined) {
    sets.push(`result = $${idx++}`);
    params.push(JSON.stringify(update.result));
  }
  if (update.error !== undefined) {
    sets.push(`error = $${idx++}`);
    params.push(update.error);
  }

  if (sets.length === 0) return getValidationRunById(id);

  params.push(id);
  return queryOne<ValidationRunRow>(
    `UPDATE validation_runs SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function getValidationRunById(id: string): Promise<ValidationRunRow | null> {
  return queryOne<ValidationRunRow>(
    "SELECT * FROM validation_runs WHERE id = $1",
    [id]
  );
}

export async function getLatestValidationRun(opportunityId: string): Promise<ValidationRunRow | null> {
  return queryOne<ValidationRunRow>(
    "SELECT * FROM validation_runs WHERE opportunity_id = $1 ORDER BY created_at DESC LIMIT 1",
    [opportunityId]
  );
}

export async function listValidationRunsForOpportunity(opportunityId: string): Promise<ValidationRunRow[]> {
  return queryMany<ValidationRunRow>(
    "SELECT * FROM validation_runs WHERE opportunity_id = $1 ORDER BY created_at DESC LIMIT 20",
    [opportunityId]
  );
}
