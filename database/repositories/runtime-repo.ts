import crypto from "crypto";
import { query, queryOne, queryMany } from "@/database/client";
import type {
  RuntimeConfig,
  RuntimeInstance,
  ScheduledJob,
  ExecutionCycle,
  CycleStage,
  RuntimeNotification,
  ResourceUsageLog,
} from "@/types/runtime";
import type { OperationsJob } from "@/types/operations";

export class RuntimeRepository {
  /**
   * Fetch active runtime configuration (or default fallback)
   */
  async getRuntimeConfig(): Promise<RuntimeConfig> {
    try {
      const row = await queryOne<any>("SELECT * FROM runtime_config WHERE id = 'global'");
      if (!row) {
        return {
          id: "global",
          worker_enabled: true,
          scheduler_enabled: true,
          safe_mode: false,
          dry_run: false,
          polling_interval_ms: 2000,
          max_global_concurrency: 5,
          max_ai_concurrency: 1,
          max_research_concurrency: 2,
          daily_cycle_interval_hours: 24,
          weekly_cycle_interval_days: 7,
          stale_job_threshold_minutes: 15,
          default_retry_limit: 3,
          metadata: {},
        };
      }
      return {
        id: row.id,
        worker_enabled: Boolean(row.worker_enabled),
        scheduler_enabled: Boolean(row.scheduler_enabled),
        safe_mode: Boolean(row.safe_mode),
        dry_run: Boolean(row.dry_run),
        polling_interval_ms: Number(row.polling_interval_ms) || 2000,
        max_global_concurrency: Number(row.max_global_concurrency) || 5,
        max_ai_concurrency: Number(row.max_ai_concurrency) || 1,
        max_research_concurrency: Number(row.max_research_concurrency) || 2,
        daily_cycle_interval_hours: Number(row.daily_cycle_interval_hours) || 24,
        weekly_cycle_interval_days: Number(row.weekly_cycle_interval_days) || 7,
        stale_job_threshold_minutes: Number(row.stale_job_threshold_minutes) || 15,
        default_retry_limit: Number(row.default_retry_limit) || 3,
        metadata: row.metadata || {},
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      };
    } catch {
      return {
        id: "global",
        worker_enabled: true,
        scheduler_enabled: true,
        safe_mode: false,
        dry_run: false,
        polling_interval_ms: 2000,
        max_global_concurrency: 5,
        max_ai_concurrency: 1,
        max_research_concurrency: 2,
        daily_cycle_interval_hours: 24,
        weekly_cycle_interval_days: 7,
        stale_job_threshold_minutes: 15,
        default_retry_limit: 3,
        metadata: {},
      };
    }
  }

  /**
   * Update runtime configuration
   */
  async updateRuntimeConfig(patch: Partial<RuntimeConfig>): Promise<RuntimeConfig> {
    const current = await this.getRuntimeConfig();
    const updated: RuntimeConfig = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    await query(
      `INSERT INTO runtime_config (
        id, worker_enabled, scheduler_enabled, safe_mode, dry_run,
        polling_interval_ms, max_global_concurrency, max_ai_concurrency,
        max_research_concurrency, daily_cycle_interval_hours,
        weekly_cycle_interval_days, stale_job_threshold_minutes,
        default_retry_limit, metadata, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (id) DO UPDATE SET
        worker_enabled = EXCLUDED.worker_enabled,
        scheduler_enabled = EXCLUDED.scheduler_enabled,
        safe_mode = EXCLUDED.safe_mode,
        dry_run = EXCLUDED.dry_run,
        polling_interval_ms = EXCLUDED.polling_interval_ms,
        max_global_concurrency = EXCLUDED.max_global_concurrency,
        max_ai_concurrency = EXCLUDED.max_ai_concurrency,
        max_research_concurrency = EXCLUDED.max_research_concurrency,
        daily_cycle_interval_hours = EXCLUDED.daily_cycle_interval_hours,
        weekly_cycle_interval_days = EXCLUDED.weekly_cycle_interval_days,
        stale_job_threshold_minutes = EXCLUDED.stale_job_threshold_minutes,
        default_retry_limit = EXCLUDED.default_retry_limit,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()`,
      [
        updated.id,
        updated.worker_enabled,
        updated.scheduler_enabled,
        updated.safe_mode,
        updated.dry_run,
        updated.polling_interval_ms,
        updated.max_global_concurrency,
        updated.max_ai_concurrency,
        updated.max_research_concurrency,
        updated.daily_cycle_interval_hours,
        updated.weekly_cycle_interval_days,
        updated.stale_job_threshold_minutes,
        updated.default_retry_limit,
        JSON.stringify(updated.metadata || {}),
      ]
    );

    return updated;
  }

  /**
   * Register or update a worker runtime instance
   */
  async upsertRuntimeInstance(instance: RuntimeInstance): Promise<void> {
    await query(
      `INSERT INTO runtime_instances (
        id, hostname, pid, status, started_at, last_heartbeat_at,
        active_jobs_count, processed_jobs_count, failed_jobs_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        last_heartbeat_at = EXCLUDED.last_heartbeat_at,
        active_jobs_count = EXCLUDED.active_jobs_count,
        processed_jobs_count = EXCLUDED.processed_jobs_count,
        failed_jobs_count = EXCLUDED.failed_jobs_count,
        metadata = EXCLUDED.metadata`,
      [
        instance.id,
        instance.hostname,
        instance.pid,
        instance.status,
        instance.started_at,
        instance.last_heartbeat_at,
        instance.active_jobs_count,
        instance.processed_jobs_count,
        instance.failed_jobs_count,
        JSON.stringify(instance.metadata || {}),
      ]
    );
  }

  /**
   * Update heartbeat for a worker instance
   */
  async updateWorkerHeartbeat(
    instanceId: string,
    activeJobs: number,
    processedJobs: number,
    failedJobs: number
  ): Promise<void> {
    await query(
      `UPDATE runtime_instances
       SET last_heartbeat_at = NOW(),
           active_jobs_count = $2,
           processed_jobs_count = $3,
           failed_jobs_count = $4,
           status = 'RUNNING'
       WHERE id = $1`,
      [instanceId, activeJobs, processedJobs, failedJobs]
    );
  }

  /**
   * Mark instance as stopped or terminated
   */
  async markWorkerTerminated(instanceId: string, status: "STOPPED" | "TERMINATED" = "STOPPED"): Promise<void> {
    await query(
      `UPDATE runtime_instances
       SET status = $2, stopped_at = NOW()
       WHERE id = $1`,
      [instanceId, status]
    );
  }

  /**
   * List active worker instances whose heartbeat is recent
   */
  async listActiveWorkers(thresholdMinutes: number = 2): Promise<RuntimeInstance[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM runtime_instances
       WHERE status IN ('STARTING', 'RUNNING')
         AND last_heartbeat_at >= NOW() - ($1 || ' minutes')::INTERVAL
       ORDER BY started_at DESC`,
      [thresholdMinutes]
    );

    return rows.map((r) => ({
      id: r.id,
      hostname: r.hostname,
      pid: Number(r.pid),
      status: r.status,
      started_at: new Date(r.started_at).toISOString(),
      last_heartbeat_at: new Date(r.last_heartbeat_at).toISOString(),
      stopped_at: r.stopped_at ? new Date(r.stopped_at).toISOString() : null,
      active_jobs_count: Number(r.active_jobs_count) || 0,
      processed_jobs_count: Number(r.processed_jobs_count) || 0,
      failed_jobs_count: Number(r.failed_jobs_count) || 0,
      metadata: r.metadata || {},
    }));
  }

  /**
   * Atomic Job Claiming from operations_jobs using PostgreSQL FOR UPDATE SKIP LOCKED
   */
  async atomicClaimNextJob(workerId: string): Promise<OperationsJob | null> {
    try {
      // Find and lock the next highest priority QUEUED job where prerequisites are ready
      const row = await queryOne<any>(
        `WITH candidate AS (
           SELECT id FROM operations_jobs
           WHERE status = 'QUEUED'
             AND (next_run_at IS NULL OR next_run_at <= NOW())
           ORDER BY priority DESC, created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         UPDATE operations_jobs j
         SET status = 'RUNNING',
             started_at = NOW(),
             attempts = j.attempts + 1,
             updated_at = NOW()
         FROM candidate
         WHERE j.id = candidate.id
         RETURNING j.*`
      );

      if (!row) return null;

      return {
        id: row.id,
        name: row.name,
        module: row.module,
        action: row.action,
        status: row.status,
        idempotency_key: row.idempotency_key,
        depends_on: Array.isArray(row.depends_on) ? row.depends_on : [],
        blocks: Array.isArray(row.blocks) ? row.blocks : [],
        priority: Number(row.priority) || 50,
        retry_policy: row.retry_policy || { max_attempts: 3, backoff_base_ms: 1000, backoff_factor: 2, max_backoff_ms: 30000 },
        attempts: Number(row.attempts) || 0,
        max_attempts: Number(row.max_attempts) || 3,
        failure_classification: row.failure_classification || null,
        last_error: row.last_error || null,
        error_stack: row.error_stack || null,
        timeout_seconds: Number(row.timeout_seconds) || 300,
        started_at: row.started_at ? new Date(row.started_at).toISOString() : null,
        completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
        next_run_at: row.next_run_at ? new Date(row.next_run_at).toISOString() : null,
        required_approval: Boolean(row.required_approval),
        approval_id: row.approval_id || null,
        required_integration: row.required_integration || null,
        resource_requirement: row.resource_requirement || { time_weight: 1, compute_weight: 1 },
        safety_classification: row.safety_classification || "ZERO_COST_AUTO",
        payload: row.payload || {},
        result: row.result || null,
        is_demo: Boolean(row.is_demo),
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
      };
    } catch (err) {
      return null;
    }
  }

  // ---------- SCHEDULED JOBS ----------

  async listScheduledJobs(options?: { status?: string; limit?: number }): Promise<ScheduledJob[]> {
    const limit = options?.limit || 50;
    let sql = `SELECT * FROM scheduled_jobs`;
    const params: any[] = [];

    if (options?.status) {
      sql += ` WHERE status = $1`;
      params.push(options.status);
    }

    sql += ` ORDER BY next_run_at ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapScheduledJob(r));
  }

  async getScheduledJobById(id: string): Promise<ScheduledJob | null> {
    const row = await queryOne<any>(`SELECT * FROM scheduled_jobs WHERE id = $1`, [id]);
    return row ? this.mapScheduledJob(row) : null;
  }

  async createScheduledJob(input: Partial<ScheduledJob>): Promise<ScheduledJob> {
    const id = input.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const nextRunAt = input.next_run_at || now;

    const row = await queryOne<any>(
      `INSERT INTO scheduled_jobs (
        id, name, job_type, target_module, target_action,
        schedule_type, cron_expression, interval_seconds, payload,
        next_run_at, status, is_demo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`,
      [
        id,
        input.name || "Unnamed Task",
        input.job_type || "RECURRING_TASK",
        input.target_module || "OPERATIONS",
        input.target_action || "RUN",
        input.schedule_type || "INTERVAL",
        input.cron_expression || null,
        input.interval_seconds || 3600,
        JSON.stringify(input.payload || {}),
        nextRunAt,
        input.status || "ACTIVE",
        input.is_demo ?? false,
      ]
    );

    return this.mapScheduledJob(row!);
  }

  async updateScheduledJob(id: string, patch: Partial<ScheduledJob>): Promise<ScheduledJob | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: any[] = [id];

    if (patch.next_run_at !== undefined) {
      params.push(patch.next_run_at);
      updates.push(`next_run_at = $${params.length}`);
    }
    if (patch.last_run_at !== undefined) {
      params.push(patch.last_run_at);
      updates.push(`last_run_at = $${params.length}`);
    }
    if (patch.total_runs !== undefined) {
      params.push(patch.total_runs);
      updates.push(`total_runs = $${params.length}`);
    }
    if (patch.status !== undefined) {
      params.push(patch.status);
      updates.push(`status = $${params.length}`);
    }

    const row = await queryOne<any>(
      `UPDATE scheduled_jobs SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );

    return row ? this.mapScheduledJob(row) : null;
  }

  async claimDueScheduledJobs(now: string = new Date().toISOString(), limit: number = 10): Promise<ScheduledJob[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM scheduled_jobs
       WHERE status = 'ACTIVE'
         AND next_run_at <= $1
       ORDER BY next_run_at ASC
       LIMIT $2`,
      [now, limit]
    );

    return rows.map((r) => this.mapScheduledJob(r));
  }

  // ---------- EXECUTION CYCLES ----------

  async createExecutionCycle(cycle: Partial<ExecutionCycle>): Promise<ExecutionCycle> {
    const id = cycle.id || crypto.randomUUID();
    const correlationId = cycle.correlation_id || `cycle_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const row = await queryOne<any>(
      `INSERT INTO execution_cycles (
        id, cycle_type, status, current_stage, stages_completed,
        stages_failed, stages_waiting, started_at, correlation_id,
        is_dry_run, is_safe_mode, metrics, decisions_generated_count,
        is_demo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        id,
        cycle.cycle_type || "DAILY",
        cycle.status || "PLANNED",
        cycle.current_stage || null,
        cycle.stages_completed || [],
        cycle.stages_failed || [],
        cycle.stages_waiting || [],
        correlationId,
        cycle.is_dry_run ?? false,
        cycle.is_safe_mode ?? false,
        JSON.stringify(cycle.metrics || {}),
        cycle.decisions_generated_count || 0,
        cycle.is_demo ?? false,
      ]
    );

    return this.mapExecutionCycle(row!);
  }

  async getExecutionCycleById(id: string): Promise<ExecutionCycle | null> {
    const row = await queryOne<any>(`SELECT * FROM execution_cycles WHERE id = $1`, [id]);
    return row ? this.mapExecutionCycle(row) : null;
  }

  async updateExecutionCycle(id: string, patch: Partial<ExecutionCycle>): Promise<ExecutionCycle | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: any[] = [id];

    if (patch.status !== undefined) {
      params.push(patch.status);
      updates.push(`status = $${params.length}`);
    }
    if (patch.current_stage !== undefined) {
      params.push(patch.current_stage);
      updates.push(`current_stage = $${params.length}`);
    }
    if (patch.stages_completed !== undefined) {
      params.push(patch.stages_completed);
      updates.push(`stages_completed = $${params.length}`);
    }
    if (patch.stages_failed !== undefined) {
      params.push(patch.stages_failed);
      updates.push(`stages_failed = $${params.length}`);
    }
    if (patch.stages_waiting !== undefined) {
      params.push(patch.stages_waiting);
      updates.push(`stages_waiting = $${params.length}`);
    }
    if (patch.completed_at !== undefined) {
      params.push(patch.completed_at);
      updates.push(`completed_at = $${params.length}`);
    }
    if (patch.duration_ms !== undefined) {
      params.push(patch.duration_ms);
      updates.push(`duration_ms = $${params.length}`);
    }
    if (patch.metrics !== undefined) {
      params.push(JSON.stringify(patch.metrics));
      updates.push(`metrics = $${params.length}::jsonb`);
    }
    if (patch.decisions_generated_count !== undefined) {
      params.push(patch.decisions_generated_count);
      updates.push(`decisions_generated_count = $${params.length}`);
    }
    if (patch.error_summary !== undefined) {
      params.push(patch.error_summary);
      updates.push(`error_summary = $${params.length}`);
    }

    const row = await queryOne<any>(
      `UPDATE execution_cycles SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );

    return row ? this.mapExecutionCycle(row) : null;
  }

  async listExecutionCycles(options?: { cycleType?: string; status?: string; limit?: number; offset?: number }): Promise<ExecutionCycle[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    let sql = `SELECT * FROM execution_cycles`;
    const params: any[] = [];
    const where: string[] = [];

    if (options?.cycleType) {
      params.push(options.cycleType);
      where.push(`cycle_type = $${params.length}`);
    }
    if (options?.status) {
      params.push(options.status);
      where.push(`status = $${params.length}`);
    }

    if (where.length > 0) {
      sql += ` WHERE ` + where.join(" AND ");
    }

    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    if (offset > 0) {
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }

    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapExecutionCycle(r));
  }

  // ---------- CYCLE STAGES ----------

  async createCycleStage(stage: Partial<CycleStage>): Promise<CycleStage> {
    const id = stage.id || crypto.randomUUID();
    const row = await queryOne<any>(
      `INSERT INTO cycle_stages (
        id, cycle_id, stage_name, phase_number, sequence_order,
        status, started_at, is_recoverable, items_processed, error, output, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        id,
        stage.cycle_id,
        stage.stage_name,
        stage.phase_number || 1,
        stage.sequence_order || 1,
        stage.status || "PLANNED",
        stage.started_at || new Date().toISOString(),
        stage.is_recoverable ?? true,
        stage.items_processed || 0,
        stage.error || null,
        JSON.stringify(stage.output || {}),
      ]
    );

    return this.mapCycleStage(row!);
  }

  async updateCycleStage(id: string, patch: Partial<CycleStage>): Promise<CycleStage | null> {
    const updates: string[] = [];
    const params: any[] = [id];

    if (patch.status !== undefined) {
      params.push(patch.status);
      updates.push(`status = $${params.length}`);
    }
    if (patch.completed_at !== undefined) {
      params.push(patch.completed_at);
      updates.push(`completed_at = $${params.length}`);
    }
    if (patch.duration_ms !== undefined) {
      params.push(patch.duration_ms);
      updates.push(`duration_ms = $${params.length}`);
    }
    if (patch.items_processed !== undefined) {
      params.push(patch.items_processed);
      updates.push(`items_processed = $${params.length}`);
    }
    if (patch.error !== undefined) {
      params.push(patch.error);
      updates.push(`error = $${params.length}`);
    }
    if (patch.output !== undefined) {
      params.push(JSON.stringify(patch.output));
      updates.push(`output = $${params.length}::jsonb`);
    }

    if (updates.length === 0) return null;

    const row = await queryOne<any>(
      `UPDATE cycle_stages SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );

    return row ? this.mapCycleStage(row) : null;
  }

  async listCycleStages(cycleId: string): Promise<CycleStage[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM cycle_stages WHERE cycle_id = $1 ORDER BY sequence_order ASC`,
      [cycleId]
    );
    return rows.map((r) => this.mapCycleStage(r));
  }

  // ---------- NOTIFICATIONS ----------

  async createNotification(notif: Partial<RuntimeNotification>): Promise<RuntimeNotification> {
    const id = notif.id || crypto.randomUUID();
    const row = await queryOne<any>(
      `INSERT INTO runtime_notifications (
        id, event_type, severity, title, message, source_module,
        entity_type, entity_id, is_acknowledged, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, NOW())
      RETURNING *`,
      [
        id,
        notif.event_type || "SYSTEM_EVENT",
        notif.severity || "INFO",
        notif.title || "Notification",
        notif.message || "",
        notif.source_module || "RUNTIME",
        notif.entity_type || null,
        notif.entity_id || null,
        JSON.stringify(notif.metadata || {}),
      ]
    );

    return this.mapNotification(row!);
  }

  async listNotifications(options?: { isAcknowledged?: boolean; limit?: number }): Promise<RuntimeNotification[]> {
    const limit = options?.limit || 50;
    let sql = `SELECT * FROM runtime_notifications`;
    const params: any[] = [];

    if (options?.isAcknowledged !== undefined) {
      sql += ` WHERE is_acknowledged = $1`;
      params.push(options.isAcknowledged);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await queryMany<any>(sql, params);
    return rows.map((r) => this.mapNotification(r));
  }

  async acknowledgeNotification(id: string, acknowledgedBy: string = "operator"): Promise<boolean> {
    const result = await query(
      `UPDATE runtime_notifications
       SET is_acknowledged = true, acknowledged_at = NOW(), acknowledged_by = $2
       WHERE id = $1`,
      [id, acknowledgedBy]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ---------- RESOURCE USAGE ----------

  async recordResourceUsage(usage: Partial<ResourceUsageLog>): Promise<void> {
    const id = usage.id || crypto.randomUUID();
    await query(
      `INSERT INTO resource_usage_logs (
        id, recorded_at, active_workers, active_jobs, queued_jobs,
        dead_letter_jobs, ai_active_requests, research_active_requests,
        concurrency_saturation_percent, avg_job_duration_ms, metadata
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        usage.active_workers || 0,
        usage.active_jobs || 0,
        usage.queued_jobs || 0,
        usage.dead_letter_jobs || 0,
        usage.ai_active_requests || 0,
        usage.research_active_requests || 0,
        usage.concurrency_saturation_percent || 0,
        usage.avg_job_duration_ms || 0,
        JSON.stringify(usage.metadata || {}),
      ]
    );
  }

  async getLatestResourceUsage(): Promise<ResourceUsageLog | null> {
    const row = await queryOne<any>(
      `SELECT * FROM resource_usage_logs ORDER BY recorded_at DESC LIMIT 1`
    );
    if (!row) return null;

    return {
      id: row.id,
      recorded_at: new Date(row.recorded_at).toISOString(),
      active_workers: Number(row.active_workers) || 0,
      active_jobs: Number(row.active_jobs) || 0,
      queued_jobs: Number(row.queued_jobs) || 0,
      dead_letter_jobs: Number(row.dead_letter_jobs) || 0,
      ai_active_requests: Number(row.ai_active_requests) || 0,
      research_active_requests: Number(row.research_active_requests) || 0,
      concurrency_saturation_percent: Number(row.concurrency_saturation_percent) || 0,
      avg_job_duration_ms: Number(row.avg_job_duration_ms) || 0,
      metadata: row.metadata || {},
    };
  }

  // ---------- HELPERS ----------

  private mapScheduledJob(r: any): ScheduledJob {
    return {
      id: r.id,
      name: r.name,
      job_type: r.job_type,
      target_module: r.target_module,
      target_action: r.target_action,
      schedule_type: r.schedule_type,
      cron_expression: r.cron_expression || null,
      interval_seconds: r.interval_seconds ? Number(r.interval_seconds) : null,
      payload: r.payload || {},
      next_run_at: new Date(r.next_run_at).toISOString(),
      last_run_at: r.last_run_at ? new Date(r.last_run_at).toISOString() : null,
      total_runs: Number(r.total_runs) || 0,
      status: r.status,
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapExecutionCycle(r: any): ExecutionCycle {
    return {
      id: r.id,
      cycle_type: r.cycle_type,
      status: r.status,
      current_stage: r.current_stage || null,
      stages_completed: Array.isArray(r.stages_completed) ? r.stages_completed : [],
      stages_failed: Array.isArray(r.stages_failed) ? r.stages_failed : [],
      stages_waiting: Array.isArray(r.stages_waiting) ? r.stages_waiting : [],
      started_at: r.started_at ? new Date(r.started_at).toISOString() : null,
      completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
      duration_ms: r.duration_ms ? Number(r.duration_ms) : null,
      correlation_id: r.correlation_id,
      is_dry_run: Boolean(r.is_dry_run),
      is_safe_mode: Boolean(r.is_safe_mode),
      metrics: r.metrics || {},
      decisions_generated_count: Number(r.decisions_generated_count) || 0,
      error_summary: r.error_summary || null,
      is_demo: Boolean(r.is_demo),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  private mapCycleStage(r: any): CycleStage {
    return {
      id: r.id,
      cycle_id: r.cycle_id,
      stage_name: r.stage_name,
      phase_number: Number(r.phase_number) || 1,
      sequence_order: Number(r.sequence_order) || 1,
      status: r.status,
      started_at: r.started_at ? new Date(r.started_at).toISOString() : null,
      completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
      duration_ms: r.duration_ms ? Number(r.duration_ms) : null,
      items_processed: Number(r.items_processed) || 0,
      is_recoverable: Boolean(r.is_recoverable),
      error: r.error || null,
      output: r.output || {},
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  private mapNotification(r: any): RuntimeNotification {
    return {
      id: r.id,
      event_type: r.event_type,
      severity: r.severity,
      title: r.title,
      message: r.message,
      source_module: r.source_module,
      entity_type: r.entity_type || null,
      entity_id: r.entity_id || null,
      is_acknowledged: Boolean(r.is_acknowledged),
      acknowledged_at: r.acknowledged_at ? new Date(r.acknowledged_at).toISOString() : null,
      acknowledged_by: r.acknowledged_by || null,
      metadata: r.metadata || {},
      created_at: new Date(r.created_at).toISOString(),
    };
  }
}

export const runtimeRepo = new RuntimeRepository();
