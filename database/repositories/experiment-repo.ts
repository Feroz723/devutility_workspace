import { queryOne, queryMany } from "../client";
import type {
  Experiment,
  CreateExperimentInput,
  UpdateExperimentInput,
  ExperimentMetric,
  CreateMetricInput,
  ExperimentJob,
  WaitlistEntry,
} from "@/types/experiment";

const JSON_FIELDS = new Set([
  "failure_criteria",
  "time_window",
  "human_actions",
  "automation_actions",
  "baseline_metrics",
  "hypothesis_details",
  "learning_data",
]);

export async function createExperiment(input: CreateExperimentInput): Promise<Experiment> {
  const row = await queryOne<Experiment>(
    `INSERT INTO experiments (
      opportunity_id, title, experiment_type, hypothesis, problem, solution,
      target_customer, channel, success_criteria, failure_criteria,
      time_window, estimated_cost_inr, actual_cost_inr, cost_classification,
      human_actions, automation_actions, baseline_metrics, hypothesis_details,
      learning_data, stage, status, start_date, end_date, is_demo
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24
    )
    RETURNING *`,
    [
      input.opportunity_id,
      input.title,
      input.experiment_type ?? "LANDING_PAGE",
      input.hypothesis ?? null,
      input.problem ?? null,
      input.solution ?? null,
      input.target_customer ?? null,
      input.channel ?? null,
      input.success_criteria ?? null,
      JSON.stringify(input.failure_criteria ?? []),
      JSON.stringify(input.time_window ?? { duration_days: 7 }),
      input.estimated_cost_inr ?? 0,
      input.actual_cost_inr ?? 0,
      input.cost_classification ?? "FREE",
      JSON.stringify(input.human_actions ?? []),
      JSON.stringify(input.automation_actions ?? []),
      JSON.stringify(input.baseline_metrics ?? {}),
      JSON.stringify(input.hypothesis_details ?? {}),
      JSON.stringify(input.learning_data ?? {}),
      input.stage ?? "DISCOVERY",
      input.status ?? "PROPOSED",
      input.start_date ?? null,
      input.end_date ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getExperimentById(id: string): Promise<Experiment | null> {
  return queryOne<Experiment>("SELECT * FROM experiments WHERE id = $1", [id]);
}

export async function getExperimentByOpportunityAndHypothesis(
  opportunityId: string,
  hypothesis: string
): Promise<Experiment | null> {
  return queryOne<Experiment>(
    `SELECT * FROM experiments
     WHERE opportunity_id = $1 AND hypothesis = $2
     ORDER BY created_at DESC LIMIT 1`,
    [opportunityId, hypothesis]
  );
}

export async function updateExperiment(id: string, input: UpdateExperimentInput): Promise<Experiment | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (JSON_FIELDS.has(key)) {
      sets.push(`${key} = $${idx++}`);
      params.push(value ? JSON.stringify(value) : null);
    } else {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getExperimentById(id);

  sets.push("updated_at = now()");
  params.push(id);

  return queryOne<Experiment>(
    `UPDATE experiments SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function listExperiments(options?: {
  opportunity_id?: string;
  status?: string;
  experiment_type?: string;
  is_demo?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ experiments: Experiment[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.opportunity_id) {
    conditions.push(`opportunity_id = $${paramIdx++}`);
    params.push(options.opportunity_id);
  }
  if (options?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }
  if (options?.experiment_type) {
    conditions.push(`experiment_type = $${paramIdx++}`);
    params.push(options.experiment_type);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${paramIdx++}`);
    params.push(options.is_demo);
  }
  if (options?.search) {
    conditions.push(`(title ILIKE $${paramIdx} OR hypothesis ILIKE $${paramIdx} OR target_customer ILIKE $${paramIdx})`);
    params.push(`%${options.search}%`);
    paramIdx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM experiments ${where}`,
    params
  );
  const total = parseInt(countResult?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const experiments = await queryMany<Experiment>(
    `SELECT * FROM experiments ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { experiments, total };
}

// ===== Metric Operations =====

export async function recordMetric(input: CreateMetricInput): Promise<ExperimentMetric> {
  const row = await queryOne<ExperimentMetric>(
    `INSERT INTO experiment_metrics (
      experiment_id, metric_name, metric_value, metric_type, source, unit, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()))
    RETURNING *`,
    [
      input.experiment_id,
      input.metric_name,
      input.metric_value,
      input.metric_type ?? null,
      input.source ?? "MANUAL",
      input.unit ?? null,
      input.recorded_at ?? null,
    ]
  );
  return row!;
}

export async function listMetricsForExperiment(experimentId: string): Promise<ExperimentMetric[]> {
  return queryMany<ExperimentMetric>(
    `SELECT * FROM experiment_metrics WHERE experiment_id = $1 ORDER BY recorded_at DESC`,
    [experimentId]
  );
}

export const listExperimentMetrics = listMetricsForExperiment;


// ===== Experiment Job Operations =====

export async function createExperimentJob(input: {
  experiment_id: string;
  status?: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
}): Promise<ExperimentJob> {
  const row = await queryOne<ExperimentJob>(
    `INSERT INTO experiment_jobs (experiment_id, status, started_at)
     VALUES ($1, $2, now())
     RETURNING *`,
    [input.experiment_id, input.status ?? "RUNNING"]
  );
  return row!;
}

export async function updateExperimentJob(
  id: string,
  update: {
    status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    error?: string | null;
  }
): Promise<ExperimentJob | null> {
  return queryOne<ExperimentJob>(
    `UPDATE experiment_jobs
     SET status = $1, error = $2, completed_at = now()
     WHERE id = $3
     RETURNING *`,
    [update.status, update.error ?? null, id]
  );
}

// ===== Waitlist Operations =====

export async function createWaitlistEntry(input: {
  experiment_id: string;
  email: string;
  source?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ entry: WaitlistEntry | null; duplicate: boolean }> {
  // Check duplicate
  const existing = await queryOne<WaitlistEntry>(
    `SELECT * FROM waitlist_entries WHERE experiment_id = $1 AND email = $2`,
    [input.experiment_id, input.email.toLowerCase().trim()]
  );
  if (existing) {
    return { entry: existing, duplicate: true };
  }

  const row = await queryOne<WaitlistEntry>(
    `INSERT INTO waitlist_entries (experiment_id, email, source, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.experiment_id,
      input.email.toLowerCase().trim(),
      input.source ?? "organic",
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  return { entry: row!, duplicate: false };
}

export async function listWaitlistForExperiment(experimentId: string): Promise<WaitlistEntry[]> {
  return queryMany<WaitlistEntry>(
    `SELECT * FROM waitlist_entries WHERE experiment_id = $1 ORDER BY created_at DESC`,
    [experimentId]
  );
}
