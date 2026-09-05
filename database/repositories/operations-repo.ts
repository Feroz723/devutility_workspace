import { queryOne, queryMany, query } from "../client";
import type {
  OperationsJob,
  OperationsJobHistory,
  OperationsEvent,
  IntegrationHealth,
  SystemState,
  AgentRegistryItem,
  SystemBackup,
  JobStatus,
  UnifiedApprovalItem,
  UnifiedManualActionItem,
} from "@/types/operations";

export interface CreateJobInput {
  name: string;
  module: string;
  action: string;
  idempotency_key: string;
  depends_on?: string[];
  blocks?: string[];
  priority?: number;
  retry_policy?: {
    max_attempts: number;
    backoff_base_ms: number;
    backoff_factor: number;
    max_backoff_ms: number;
  };
  max_attempts?: number;
  timeout_seconds?: number;
  required_approval?: boolean;
  approval_id?: string;
  required_integration?: string;
  resource_requirement?: Record<string, any>;
  safety_classification?: "ZERO_COST_AUTO" | "SENSITIVE_REVIEW" | "FINANCIAL_APPROVAL" | "PROHIBITED";
  payload?: Record<string, any>;
  is_demo?: boolean;
}

export async function createJob(input: CreateJobInput): Promise<OperationsJob> {
  const row = await queryOne<OperationsJob>(
    `INSERT INTO operations_jobs (
      name, module, action, idempotency_key, depends_on, blocks,
      priority, retry_policy, max_attempts, timeout_seconds,
      required_approval, approval_id, required_integration,
      resource_requirement, safety_classification, payload, is_demo,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'QUEUED')
    ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
    RETURNING *`,
    [
      input.name,
      input.module,
      input.action,
      input.idempotency_key,
      JSON.stringify(input.depends_on ?? []),
      JSON.stringify(input.blocks ?? []),
      input.priority ?? 50,
      JSON.stringify(
        input.retry_policy ?? {
          max_attempts: 3,
          backoff_base_ms: 1000,
          backoff_factor: 2,
          max_backoff_ms: 30000,
        }
      ),
      input.max_attempts ?? 3,
      input.timeout_seconds ?? 300,
      input.required_approval ?? false,
      input.approval_id ?? null,
      input.required_integration ?? null,
      JSON.stringify(input.resource_requirement ?? { time_weight: 1, compute_weight: 1 }),
      input.safety_classification ?? "ZERO_COST_AUTO",
      JSON.stringify(input.payload ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getJobById(id: string): Promise<OperationsJob | null> {
  return queryOne<OperationsJob>("SELECT * FROM operations_jobs WHERE id = $1", [id]);
}

export async function getJobByIdempotencyKey(key: string): Promise<OperationsJob | null> {
  return queryOne<OperationsJob>("SELECT * FROM operations_jobs WHERE idempotency_key = $1", [key]);
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  updates?: {
    result?: Record<string, any>;
    last_error?: string;
    error_stack?: string;
    failure_classification?: string;
    started_at?: string;
    completed_at?: string;
    next_run_at?: string;
    attempts?: number;
  }
): Promise<OperationsJob | null> {
  const fields: string[] = ["status = $2", "updated_at = now()"];
  const params: unknown[] = [id, status];
  let pIdx = 3;

  if (updates?.result !== undefined) {
    fields.push(`result = $${pIdx++}`);
    params.push(JSON.stringify(updates.result));
  }
  if (updates?.last_error !== undefined) {
    fields.push(`last_error = $${pIdx++}`);
    params.push(updates.last_error);
  }
  if (updates?.error_stack !== undefined) {
    fields.push(`error_stack = $${pIdx++}`);
    params.push(updates.error_stack);
  }
  if (updates?.failure_classification !== undefined) {
    fields.push(`failure_classification = $${pIdx++}`);
    params.push(updates.failure_classification);
  }
  if (updates?.started_at !== undefined) {
    fields.push(`started_at = $${pIdx++}`);
    params.push(updates.started_at);
  }
  if (updates?.completed_at !== undefined) {
    fields.push(`completed_at = $${pIdx++}`);
    params.push(updates.completed_at);
  }
  if (updates?.next_run_at !== undefined) {
    fields.push(`next_run_at = $${pIdx++}`);
    params.push(updates.next_run_at);
  }
  if (updates?.attempts !== undefined) {
    fields.push(`attempts = $${pIdx++}`);
    params.push(updates.attempts);
  }

  return queryOne<OperationsJob>(
    `UPDATE operations_jobs SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function listJobs(options?: {
  status?: JobStatus;
  module?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: OperationsJob[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;

  if (options?.status) {
    conditions.push(`status = $${pIdx++}`);
    params.push(options.status);
  }
  if (options?.module) {
    conditions.push(`module = $${pIdx++}`);
    params.push(options.module);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${pIdx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM operations_jobs ${where}`,
    params
  );
  const total = parseInt(countRes?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const jobs = await queryMany<OperationsJob>(
    `SELECT * FROM operations_jobs ${where} ORDER BY priority DESC, created_at ASC LIMIT $${pIdx++} OFFSET $${pIdx++}`,
    [...params, limit, offset]
  );

  return { jobs, total };
}

export async function listDeadLetterJobs(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ jobs: OperationsJob[]; total: number }> {
  return listJobs({ status: "DEAD_LETTER", limit: options?.limit, offset: options?.offset });
}

export async function atomicClaimNextJob(): Promise<OperationsJob | null> {
  // Atomically select and lock the highest-priority runnable QUEUED job whose next_run_at is reached
  const row = await queryOne<OperationsJob>(
    `UPDATE operations_jobs
     SET status = 'RUNNING', started_at = now(), updated_at = now()
     WHERE id = (
       SELECT id FROM operations_jobs
       WHERE status = 'QUEUED'
         AND (next_run_at IS NULL OR next_run_at <= now())
       ORDER BY priority DESC, created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`
  );
  return row;
}

export async function resetStaleRunningJobs(timeoutMinutes: number = 10): Promise<number> {
  const result = await query(
    `UPDATE operations_jobs
     SET status = 'RETRYING',
         attempts = attempts + 1,
         last_error = 'TIMEOUT: Job exceeded running timeout limit.',
         updated_at = now()
     WHERE status = 'RUNNING'
       AND started_at < (now() - ($1 || ' minutes')::interval)`,
    [timeoutMinutes]
  );
  return result.rowCount ?? 0;
}

// 2. Job History
export async function addJobHistory(entry: {
  job_id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  output?: Record<string, any>;
}): Promise<OperationsJobHistory> {
  const row = await queryOne<OperationsJobHistory>(
    `INSERT INTO operations_job_history (
      job_id, attempt_number, status, started_at, completed_at, duration_ms, error, output
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      entry.job_id,
      entry.attempt_number,
      entry.status,
      entry.started_at,
      entry.completed_at ?? null,
      entry.duration_ms ?? null,
      entry.error ?? null,
      JSON.stringify(entry.output ?? {}),
    ]
  );
  return row!;
}

export async function listJobHistory(jobId: string): Promise<OperationsJobHistory[]> {
  return queryMany<OperationsJobHistory>(
    "SELECT * FROM operations_job_history WHERE job_id = $1 ORDER BY attempt_number ASC",
    [jobId]
  );
}

// 3. Global Event Bus
export async function publishEvent(event: {
  event_type: string;
  source_module: string;
  entity_type: string;
  entity_id: string;
  correlation_id?: string;
  causation_id?: string;
  payload?: Record<string, any>;
  is_demo?: boolean;
}): Promise<OperationsEvent> {
  const row = await queryOne<OperationsEvent>(
    `INSERT INTO operations_events (
      event_type, source_module, entity_type, entity_id, correlation_id, causation_id, payload, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      event.event_type,
      event.source_module,
      event.entity_type,
      event.entity_id,
      event.correlation_id ?? null,
      event.causation_id ?? null,
      JSON.stringify(event.payload ?? {}),
      event.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listEvents(options?: {
  source_module?: string;
  event_type?: string;
  correlation_id?: string;
  limit?: number;
}): Promise<OperationsEvent[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;

  if (options?.source_module) {
    conditions.push(`source_module = $${pIdx++}`);
    params.push(options.source_module);
  }
  if (options?.event_type) {
    conditions.push(`event_type = $${pIdx++}`);
    params.push(options.event_type);
  }
  if (options?.correlation_id) {
    conditions.push(`correlation_id = $${pIdx++}`);
    params.push(options.correlation_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 50;

  return queryMany<OperationsEvent>(
    `SELECT * FROM operations_events ${where} ORDER BY timestamp DESC LIMIT $${pIdx++}`,
    [...params, limit]
  );
}

// 4. Integration Health
export async function upsertIntegrationHealth(health: {
  provider: string;
  category: string;
  capabilities: string[];
  connection_status: string;
  last_successful_check?: string | null;
  last_failure?: string | null;
  last_error?: string | null;
  required_env_vars: string[];
  manual_setup_instructions?: string | null;
  latency_ms?: number | null;
}): Promise<IntegrationHealth> {
  const row = await queryOne<IntegrationHealth>(
    `INSERT INTO integration_health (
      provider, category, capabilities, connection_status, last_successful_check,
      last_failure, last_error, required_env_vars, manual_setup_instructions, latency_ms, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    ON CONFLICT (provider) DO UPDATE SET
      category = EXCLUDED.category,
      capabilities = EXCLUDED.capabilities,
      connection_status = EXCLUDED.connection_status,
      last_successful_check = COALESCE(EXCLUDED.last_successful_check, integration_health.last_successful_check),
      last_failure = COALESCE(EXCLUDED.last_failure, integration_health.last_failure),
      last_error = EXCLUDED.last_error,
      required_env_vars = EXCLUDED.required_env_vars,
      manual_setup_instructions = EXCLUDED.manual_setup_instructions,
      latency_ms = EXCLUDED.latency_ms,
      updated_at = now()
    RETURNING *`,
    [
      health.provider,
      health.category,
      JSON.stringify(health.capabilities),
      health.connection_status,
      health.last_successful_check ?? null,
      health.last_failure ?? null,
      health.last_error ?? null,
      JSON.stringify(health.required_env_vars),
      health.manual_setup_instructions ?? null,
      health.latency_ms ?? null,
    ]
  );
  return row!;
}

export async function listIntegrationHealth(): Promise<IntegrationHealth[]> {
  return queryMany<IntegrationHealth>("SELECT * FROM integration_health ORDER BY category, provider");
}

export async function getIntegrationHealth(provider: string): Promise<IntegrationHealth | null> {
  return queryOne<IntegrationHealth>("SELECT * FROM integration_health WHERE provider = $1", [provider]);
}

// 5. System State & Governance
export async function getSystemState(): Promise<SystemState> {
  let state = await queryOne<SystemState>("SELECT * FROM system_state WHERE id = 'GLOBAL_SYSTEM_STATE'");
  if (!state) {
    state = await queryOne<SystemState>(
      `INSERT INTO system_state (id, readiness_status, readiness_reasons, is_paused, is_kill_switch_active, spending_limit_inr)
       VALUES ('GLOBAL_SYSTEM_STATE', 'SYSTEM_PARTIALLY_READY', '["Baseline initialized"]'::jsonb, false, false, 0)
       RETURNING *`
    );
  }
  return state!;
}

export async function updateSystemState(updates: Partial<SystemState>): Promise<SystemState> {
  const current = await getSystemState();
  const fields: string[] = ["updated_at = now()"];
  const params: unknown[] = [];
  let pIdx = 1;

  if (updates.readiness_status) {
    fields.push(`readiness_status = $${pIdx++}`);
    params.push(updates.readiness_status);
  }
  if (updates.readiness_reasons) {
    fields.push(`readiness_reasons = $${pIdx++}`);
    params.push(JSON.stringify(updates.readiness_reasons));
  }
  if (updates.is_paused !== undefined) {
    fields.push(`is_paused = $${pIdx++}`);
    params.push(updates.is_paused);
  }
  if (updates.pause_reason !== undefined) {
    fields.push(`pause_reason = $${pIdx++}`);
    params.push(updates.pause_reason);
  }
  if (updates.is_kill_switch_active !== undefined) {
    fields.push(`is_kill_switch_active = $${pIdx++}`);
    params.push(updates.is_kill_switch_active);
  }
  if (updates.kill_switch_triggered_at !== undefined) {
    fields.push(`kill_switch_triggered_at = $${pIdx++}`);
    params.push(updates.kill_switch_triggered_at);
  }
  if (updates.kill_switch_reason !== undefined) {
    fields.push(`kill_switch_reason = $${pIdx++}`);
    params.push(updates.kill_switch_reason);
  }
  if (updates.active_cycle) {
    fields.push(`active_cycle = $${pIdx++}`);
    params.push(updates.active_cycle);
  }
  if (updates.last_daily_cycle_at) {
    fields.push(`last_daily_cycle_at = $${pIdx++}`);
    params.push(updates.last_daily_cycle_at);
  }
  if (updates.last_weekly_cycle_at) {
    fields.push(`last_weekly_cycle_at = $${pIdx++}`);
    params.push(updates.last_weekly_cycle_at);
  }
  if (updates.spending_limit_inr !== undefined) {
    fields.push(`spending_limit_inr = $${pIdx++}`);
    params.push(updates.spending_limit_inr);
  }

  return (await queryOne<SystemState>(
    `UPDATE system_state SET ${fields.join(", ")} WHERE id = 'GLOBAL_SYSTEM_STATE' RETURNING *`,
    params
  ))!;
}

// 6. Agent Registry
export async function upsertAgent(agent: {
  id: string;
  name: string;
  phase_number: number;
  capabilities: string[];
  status: string;
  dependencies?: string[];
  configuration?: Record<string, any>;
}): Promise<AgentRegistryItem> {
  const row = await queryOne<AgentRegistryItem>(
    `INSERT INTO agent_registry (
      id, name, phase_number, capabilities, status, dependencies, configuration, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phase_number = EXCLUDED.phase_number,
      capabilities = EXCLUDED.capabilities,
      status = EXCLUDED.status,
      dependencies = EXCLUDED.dependencies,
      configuration = EXCLUDED.configuration,
      updated_at = now()
    RETURNING *`,
    [
      agent.id,
      agent.name,
      agent.phase_number,
      JSON.stringify(agent.capabilities),
      agent.status,
      JSON.stringify(agent.dependencies ?? []),
      JSON.stringify(agent.configuration ?? {}),
    ]
  );
  return row!;
}

export async function listAgents(): Promise<AgentRegistryItem[]> {
  return queryMany<AgentRegistryItem>("SELECT * FROM agent_registry ORDER BY phase_number ASC");
}

export async function updateAgentStatus(
  id: string,
  status: string,
  lastError?: string
): Promise<AgentRegistryItem | null> {
  return queryOne<AgentRegistryItem>(
    `UPDATE agent_registry
     SET status = $2,
         last_error = $3,
         last_execution_at = now(),
         last_success_at = CASE WHEN $2 = 'ACTIVE' THEN now() ELSE last_success_at END,
         last_failure_at = CASE WHEN $2 IN ('FAILED', 'DEGRADED') THEN now() ELSE last_failure_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status, lastError ?? null]
  );
}

// 7. System Backups
export async function createBackupRecord(backup: {
  backup_type: "FULL" | "CONFIG_ONLY" | "AUDIT_ONLY" | "BUSINESS_DATA";
  file_path: string;
  file_size_bytes: number;
  checksum_sha256: string;
  includes_secrets?: boolean;
  status?: "COMPLETED" | "FAILED" | "RESTORING" | "RESTORED";
  metadata?: Record<string, any>;
}): Promise<SystemBackup> {
  const row = await queryOne<SystemBackup>(
    `INSERT INTO system_backups (
      backup_type, file_path, file_size_bytes, checksum_sha256, includes_secrets, status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      backup.backup_type,
      backup.file_path,
      backup.file_size_bytes,
      backup.checksum_sha256,
      backup.includes_secrets ?? false,
      backup.status ?? "COMPLETED",
      JSON.stringify(backup.metadata ?? {}),
    ]
  );
  return row!;
}

export async function listBackups(): Promise<SystemBackup[]> {
  return queryMany<SystemBackup>("SELECT * FROM system_backups ORDER BY created_at DESC");
}

export async function getBackupById(id: string): Promise<SystemBackup | null> {
  return queryOne<SystemBackup>("SELECT * FROM system_backups WHERE id = $1", [id]);
}

// 8. Aggregated Approvals
export async function listUnifiedApprovals(): Promise<UnifiedApprovalItem[]> {
  const items: UnifiedApprovalItem[] = [];

  // 1. From approvals table
  const coreApprovals = await queryMany<any>(
    "SELECT * FROM approvals WHERE status = 'PENDING' ORDER BY created_at DESC"
  ).catch(() => []);
  for (const a of coreApprovals) {
    items.push({
      id: a.id,
      action_type: a.action_type,
      action_description: a.action_description,
      originating_module: a.metadata?.module || "GENERAL",
      entity_type: a.related_experiment_id ? "EXPERIMENT" : a.related_opportunity_id ? "OPPORTUNITY" : "SYSTEM",
      entity_id: a.related_experiment_id || a.related_opportunity_id,
      expected_effect: a.expected_benefit,
      estimated_cost_inr: Number(a.estimated_cost_inr) || 0,
      risk_level: a.risk_level || "low",
      evidence_summary: a.reason,
      requires_approval: true,
      status: a.status,
      requested_by: a.requested_by,
      created_at: a.created_at,
    });
  }

  // 2. From portfolio_decisions requiring approval
  const decisions = await queryMany<any>(
    "SELECT * FROM portfolio_decisions WHERE requires_approval = true AND status = 'PROPOSED' ORDER BY created_at DESC"
  ).catch(() => []);
  for (const d of decisions) {
    items.push({
      id: d.id,
      action_type: d.action,
      action_description: d.recommendation,
      originating_module: "BUSINESS_INTELLIGENCE",
      entity_type: d.scope,
      entity_id: d.target_id,
      expected_effect: `Portfolio action: ${d.action} on ${d.scope}`,
      estimated_cost_inr: 0,
      risk_level: d.risk_level?.toLowerCase() || "medium",
      evidence_summary: d.recommendation,
      requires_approval: true,
      status: "PENDING",
      requested_by: "portfolio_engine",
      created_at: d.created_at,
    });
  }

  // 3. From customer_interventions requiring approval
  const interventions = await queryMany<any>(
    "SELECT * FROM customer_interventions WHERE status = 'PROPOSED' ORDER BY created_at DESC"
  ).catch(() => []);
  for (const i of interventions) {
    items.push({
      id: i.id,
      action_type: i.intervention_type,
      action_description: i.message_content || `Customer intervention: ${i.intervention_type}`,
      originating_module: "CUSTOMER_SUCCESS",
      entity_type: "CUSTOMER",
      entity_id: i.customer_id,
      expected_effect: `Engage customer to mitigate ${i.trigger_reason}`,
      estimated_cost_inr: 0,
      risk_level: "low",
      evidence_summary: i.trigger_reason,
      requires_approval: true,
      status: "PENDING",
      requested_by: "cs_engine",
      created_at: i.created_at,
    });
  }

  return items;
}

// 9. Aggregated Manual Setup Actions
export async function listUnifiedManualActions(): Promise<UnifiedManualActionItem[]> {
  const actions: UnifiedManualActionItem[] = [];

  // Check integration health
  const integrations = await listIntegrationHealth();
  for (const int of integrations) {
    if (int.connection_status === "NOT_CONNECTED" || int.connection_status === "REQUIRES_MANUAL_SETUP") {
      actions.push({
        id: `setup-${int.provider.toLowerCase()}`,
        title: `Configure ${int.provider} credentials`,
        module: int.category,
        category: "INTEGRATION",
        what: `External provider ${int.provider} is currently not connected.`,
        why: `Required for live ${int.capabilities.join(", ") || "external capabilities"}.`,
        where_location: `.env or hosting provider environment variables`,
        how_instructions: int.manual_setup_instructions || `Define: ${int.required_env_vars.join(", ")}`,
        status: int.connection_status as any,
        required_keys: int.required_env_vars,
        severity: int.provider === "POSTGRES" ? "HIGH" : "MEDIUM",
      });
    }
  }

  return actions;
}

export const operationsRepo = {
  createJob,
  getJobById,
  getJobByIdempotencyKey,
  updateJobStatus,
  listJobs,
  listDeadLetterJobs,
  atomicClaimNextJob,
  resetStaleRunningJobs,
  addJobHistory,
  listJobHistory,
  publishEvent,
  listEvents,
  upsertIntegrationHealth,
  listIntegrationHealth,
  getIntegrationHealth,
  getSystemState,
  updateSystemState,
  upsertAgent,
  listAgents,
  updateAgentStatus,
  createBackupRecord,
  listBackups,
  getBackupById,
  listUnifiedApprovals,
  listUnifiedManualActions,
};
