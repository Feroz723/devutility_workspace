import { query, queryOne, queryMany } from "../client";
import type { ExtractedEvidence } from "@/research/types";

export interface ResearchRunRow {
  id: string;
  opportunity_id: string | null;
  provider: string | null;
  query: string | null;
  run_type: string;
  status: "pending" | "running" | "completed" | "failed";
  cost_classification: "FREE" | "REQUIRES_APPROVAL" | "BLOCKED";
  results: Record<string, unknown>;
  result_summary: Record<string, unknown>;
  opportunities_created: number;
  opportunities_updated: number;
  evidence_collected: number;
  duration_ms: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ResearchJobRow {
  id: string;
  research_run_id: string | null;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  query: string | null;
  provider: string | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  created_at: string;
}

export async function createResearchRun(input: {
  opportunity_id?: string;
  provider?: string;
  query?: string;
  run_type?: string;
  cost_classification?: "FREE" | "REQUIRES_APPROVAL" | "BLOCKED";
}): Promise<ResearchRunRow> {
  const row = await queryOne<ResearchRunRow>(
    `INSERT INTO research_runs (
      opportunity_id, provider, query, run_type, status,
      cost_classification, started_at
    ) VALUES ($1, $2, $3, $4, 'running', $5, now())
    RETURNING *`,
    [
      input.opportunity_id ?? null,
      input.provider ?? "multi_provider",
      input.query ?? null,
      input.run_type ?? "comprehensive",
      input.cost_classification ?? "FREE",
    ]
  );
  return row!;
}

export async function updateResearchRun(
  id: string,
  input: {
    status?: "completed" | "failed";
    results?: Record<string, unknown>;
    result_summary?: Record<string, unknown>;
    opportunities_created?: number;
    opportunities_updated?: number;
    evidence_collected?: number;
    duration_ms?: number;
    error?: string;
  }
): Promise<ResearchRunRow | null> {
  const row = await queryOne<ResearchRunRow>(
    `UPDATE research_runs SET
      status = COALESCE($2, status),
      results = COALESCE($3, results),
      result_summary = COALESCE($4, result_summary),
      opportunities_created = COALESCE($5, opportunities_created),
      opportunities_updated = COALESCE($6, opportunities_updated),
      evidence_collected = COALESCE($7, evidence_collected),
      duration_ms = COALESCE($8, duration_ms),
      error = COALESCE($9, error),
      completed_at = now()
    WHERE id = $1
    RETURNING *`,
    [
      id,
      input.status ?? null,
      input.results ? JSON.stringify(input.results) : null,
      input.result_summary ? JSON.stringify(input.result_summary) : null,
      input.opportunities_created ?? null,
      input.opportunities_updated ?? null,
      input.evidence_collected ?? null,
      input.duration_ms ?? null,
      input.error ?? null,
    ]
  );
  return row;
}

export async function getResearchRunById(id: string): Promise<ResearchRunRow | null> {
  return queryOne<ResearchRunRow>("SELECT * FROM research_runs WHERE id = $1", [id]);
}

export async function listResearchRuns(limit: number = 20): Promise<ResearchRunRow[]> {
  return queryMany<ResearchRunRow>(
    "SELECT * FROM research_runs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
}

// ===== Opportunity Evidence =====

export async function createOpportunityEvidence(
  opportunityId: string,
  evidence: ExtractedEvidence
): Promise<void> {
  await query(
    `INSERT INTO opportunity_evidence (
      opportunity_id, type, title, description, source_url,
      source_type, source_name, evidence_text, evidence_strength,
      evidence_nature, source_quality, metadata
    ) VALUES ($1, 'social_mention', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      opportunityId,
      evidence.source_name,
      evidence.evidence_text.slice(0, 200),
      evidence.source_url,
      evidence.source_type,
      evidence.source_name,
      evidence.evidence_text,
      evidence.evidence_strength,
      evidence.evidence_nature,
      evidence.source_quality,
      JSON.stringify(evidence.metadata ?? {}),
    ]
  );
}

export async function getEvidenceByOpportunityId(
  opportunityId: string
): Promise<ExtractedEvidence[]> {
  const rows = await queryMany<{
    source_type: string;
    source_name: string;
    source_url: string;
    evidence_text: string;
    evidence_strength: "LOW" | "MEDIUM" | "HIGH";
    evidence_nature: "DIRECT" | "INFERRED" | "AI_INTERPRETATION";
    source_quality: "PRIMARY" | "SECONDARY" | "LOWER_CONFIDENCE";
    metadata: Record<string, unknown>;
  }>(
    `SELECT source_type, source_name, source_url, evidence_text,
            evidence_strength, evidence_nature, source_quality, metadata
     FROM opportunity_evidence
     WHERE opportunity_id = $1
     ORDER BY created_at DESC`,
    [opportunityId]
  );

  return rows.map((r) => ({
    source_type: r.source_type || "web",
    source_name: r.source_name || "Unknown",
    source_url: r.source_url || "",
    evidence_text: r.evidence_text || "",
    evidence_strength: r.evidence_strength || "MEDIUM",
    evidence_nature: r.evidence_nature || "DIRECT",
    source_quality: r.source_quality || "PRIMARY",
    metadata: r.metadata || {},
  }));
}

// ===== Research Jobs =====

export async function createResearchJob(queryStr?: string, provider?: string): Promise<ResearchJobRow> {
  const row = await queryOne<ResearchJobRow>(
    `INSERT INTO research_jobs (query, provider, status)
     VALUES ($1, $2, 'QUEUED')
     RETURNING *`,
    [queryStr ?? null, provider ?? null]
  );
  return row!;
}

export async function updateResearchJob(
  id: string,
  input: {
    status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    research_run_id?: string;
    error?: string;
  }
): Promise<ResearchJobRow | null> {
  const row = await queryOne<ResearchJobRow>(
    `UPDATE research_jobs SET
      status = $2,
      research_run_id = COALESCE($3, research_run_id),
      error = COALESCE($4, error),
      started_at = CASE WHEN $2 = 'RUNNING' THEN now() ELSE started_at END,
      completed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED', 'CANCELLED') THEN now() ELSE completed_at END
    WHERE id = $1
    RETURNING *`,
    [id, input.status, input.research_run_id ?? null, input.error ?? null]
  );
  return row;
}
