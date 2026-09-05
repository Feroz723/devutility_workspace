import { queryOne, queryMany } from "../client";
import type { Opportunity, CreateOpportunityInput, UpdateOpportunityInput, OpportunityFilter } from "@/types/opportunity";

export async function createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
  const row = await queryOne<Opportunity>(
    `INSERT INTO opportunities (
      title, problem, problem_statement, target_customer, target_market,
      source, source_url, evidence, demand_score, competition_score,
      monetization_score, automation_score, zero_cost_score,
      overall_score, decision, estimated_revenue, estimated_time_to_test, human_involvement,
      risk_level, status, is_demo, research_confidence, evidence_count,
      source_count, last_researched_at, research_run_count, competitors,
      monetization_type, monetization_confidence,
      validation_score, priority_score, validation_status,
      customer_profile, proposed_solution, experiment_proposal
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
      $31,$32,$33,$34,$35
    )
    RETURNING *`,
    [
      input.title,
      input.problem ?? null,
      input.problem_statement ?? null,
      input.target_customer ?? null,
      input.target_market ?? null,
      input.source ?? null,
      input.source_url || null,
      JSON.stringify(input.evidence ?? []),
      input.demand_score ?? null,
      input.competition_score ?? null,
      input.monetization_score ?? null,
      input.automation_score ?? null,
      input.zero_cost_score ?? null,
      input.overall_score ?? null,
      input.decision ?? null,
      input.estimated_revenue ?? null,
      input.estimated_time_to_test ?? null,
      input.human_involvement ?? null,
      input.risk_level ?? null,
      input.status ?? "new",
      input.is_demo ?? false,
      input.research_confidence ?? 0,
      input.evidence_count ?? 0,
      input.source_count ?? 0,
      input.last_researched_at ?? null,
      input.research_run_count ?? 0,
      JSON.stringify(input.competitors ?? []),
      input.monetization_type ?? null,
      input.monetization_confidence ?? null,
      input.validation_score ?? null,
      input.priority_score ?? null,
      input.validation_status ?? "UNVALIDATED",
      input.customer_profile ? JSON.stringify(input.customer_profile) : null,
      input.proposed_solution ? JSON.stringify(input.proposed_solution) : null,
      input.experiment_proposal ? JSON.stringify(input.experiment_proposal) : null,
    ]
  );
  return row!;
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  return queryOne<Opportunity>("SELECT * FROM opportunities WHERE id = $1", [id]);
}

const JSON_FIELDS = new Set([
  "evidence",
  "competitors",
  "customer_profile",
  "proposed_solution",
  "experiment_proposal",
]);

export async function updateOpportunity(id: string, input: UpdateOpportunityInput): Promise<Opportunity | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const fields: Array<[keyof UpdateOpportunityInput, unknown]> = Object.entries(input) as Array<[keyof UpdateOpportunityInput, unknown]>;

  for (const [key, value] of fields) {
    if (value === undefined) continue;
    if (JSON_FIELDS.has(key)) {
      sets.push(`${key} = $${idx++}`);
      params.push(value ? JSON.stringify(value) : null);
    } else if (key === "source_url") {
      sets.push(`${key} = $${idx++}`);
      params.push(value || null);
    } else {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getOpportunityById(id);

  sets.push(`updated_at = now()`);
  params.push(id);

  return queryOne<Opportunity>(
    `UPDATE opportunities SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function deleteOpportunity(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    "DELETE FROM opportunities WHERE id = $1 RETURNING id",
    [id]
  );
  return result !== null;
}

export async function listOpportunities(filter: OpportunityFilter = {}): Promise<{
  opportunities: Opportunity[];
  total: number;
  page: number;
  limit: number;
}> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filter.search) {
    conditions.push(`(title ILIKE $${paramIdx} OR problem ILIKE $${paramIdx} OR target_customer ILIKE $${paramIdx})`);
    params.push(`%${filter.search}%`);
    paramIdx++;
  }

  if (filter.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filter.status);
  }

  if (filter.decision) {
    conditions.push(`decision = $${paramIdx++}`);
    params.push(filter.decision);
  }

  if (filter.validation_status) {
    conditions.push(`validation_status = $${paramIdx++}`);
    params.push(filter.validation_status);
  }

  if (filter.min_score !== undefined) {
    conditions.push(`overall_score >= $${paramIdx++}`);
    params.push(filter.min_score);
  }

  if (filter.max_score !== undefined) {
    conditions.push(`overall_score <= $${paramIdx++}`);
    params.push(filter.max_score);
  }

  if (filter.is_demo !== undefined) {
    conditions.push(`is_demo = $${paramIdx++}`);
    params.push(filter.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortBy = filter.sort_by ?? "created_at";
  const sortOrder = filter.sort_order ?? "desc";
  const allowedSorts = [
    "created_at",
    "overall_score",
    "validation_score",
    "priority_score",
    "title",
    "status",
    "updated_at",
  ];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : "created_at";
  const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
  const nullsClause = ["overall_score", "validation_score", "priority_score"].includes(safeSortBy)
    ? " NULLS LAST"
    : "";

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM opportunities ${where}`,
    params
  );
  const total = parseInt(countResult?.count ?? "0", 10);

  const page = filter.page ?? 1;
  const limit = filter.limit ?? 20;
  const offset = (page - 1) * limit;

  const opportunities = await queryMany<Opportunity>(
    `SELECT * FROM opportunities ${where}
     ORDER BY ${safeSortBy} ${safeSortOrder}${nullsClause}
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { opportunities, total, page, limit };
}
