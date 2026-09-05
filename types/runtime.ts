import { z } from "zod";

// 1. Runtime Status
export const RuntimeStatus = z.enum([
  "STARTING",
  "RUNNING",
  "PAUSED",
  "STOPPED",
  "SAFE_MODE",
  "DRAINING",
  "BLOCKED",
  "TERMINATED",
]);
export type RuntimeStatus = z.infer<typeof RuntimeStatus>;

// 2. Cycle Types & Statuses
export const CycleType = z.enum(["DAILY", "WEEKLY", "ADHOC"]);
export type CycleType = z.infer<typeof CycleType>;

export const CycleStatus = z.enum([
  "PLANNED",
  "RUNNING",
  "PAUSED",
  "WAITING",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type CycleStatus = z.infer<typeof CycleStatus>;

export const StageStatus = z.enum([
  "PLANNED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
  "WAITING_APPROVAL",
]);
export type StageStatus = z.infer<typeof StageStatus>;

// 3. Schedule Types & Statuses
export const ScheduleType = z.enum(["CRON", "INTERVAL", "ONE_TIME", "RETRY_AT"]);
export type ScheduleType = z.infer<typeof ScheduleType>;

export const ScheduleStatus = z.enum(["ACTIVE", "PAUSED", "COMPLETED", "DISABLED"]);
export type ScheduleStatus = z.infer<typeof ScheduleStatus>;

// 4. Runtime Configuration Schema
export const RuntimeConfigSchema = z.object({
  id: z.string().default("global"),
  worker_enabled: z.boolean().default(true),
  scheduler_enabled: z.boolean().default(true),
  safe_mode: z.boolean().default(false),
  dry_run: z.boolean().default(false),
  polling_interval_ms: z.number().int().min(500).max(60000).default(2000),
  max_global_concurrency: z.number().int().min(1).max(20).default(5),
  max_ai_concurrency: z.number().int().min(1).max(5).default(1),
  max_research_concurrency: z.number().int().min(1).max(5).default(2),
  daily_cycle_interval_hours: z.number().int().min(1).max(168).default(24),
  weekly_cycle_interval_days: z.number().int().min(1).max(30).default(7),
  stale_job_threshold_minutes: z.number().int().min(1).max(120).default(15),
  default_retry_limit: z.number().int().min(0).max(10).default(3),
  metadata: z.record(z.any()).default({}),
  updated_at: z.string().optional(),
});
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

// 5. Runtime Instance (Worker process registration)
export const RuntimeInstanceSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  pid: z.number().int(),
  status: RuntimeStatus,
  started_at: z.string(),
  last_heartbeat_at: z.string(),
  stopped_at: z.string().nullable().optional(),
  active_jobs_count: z.number().int().default(0),
  processed_jobs_count: z.number().int().default(0),
  failed_jobs_count: z.number().int().default(0),
  metadata: z.record(z.any()).default({}),
});
export type RuntimeInstance = z.infer<typeof RuntimeInstanceSchema>;

// 6. Scheduled Job Schema
export const ScheduledJobSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  job_type: z.string(),
  target_module: z.string(),
  target_action: z.string(),
  schedule_type: ScheduleType,
  cron_expression: z.string().nullable().optional(),
  interval_seconds: z.number().int().nullable().optional(),
  payload: z.record(z.any()).default({}),
  next_run_at: z.string(),
  last_run_at: z.string().nullable().optional(),
  total_runs: z.number().int().default(0),
  status: ScheduleStatus,
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScheduledJob = z.infer<typeof ScheduledJobSchema>;

// 7. Execution Cycle Schema
export const ExecutionCycleSchema = z.object({
  id: z.string().uuid(),
  cycle_type: CycleType,
  status: CycleStatus,
  current_stage: z.string().nullable().optional(),
  stages_completed: z.array(z.string()).default([]),
  stages_failed: z.array(z.string()).default([]),
  stages_waiting: z.array(z.string()).default([]),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  duration_ms: z.number().int().nullable().optional(),
  correlation_id: z.string(),
  is_dry_run: z.boolean().default(false),
  is_safe_mode: z.boolean().default(false),
  metrics: z.record(z.any()).default({}),
  decisions_generated_count: z.number().int().default(0),
  error_summary: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ExecutionCycle = z.infer<typeof ExecutionCycleSchema>;

// 8. Cycle Stage Schema
export const CycleStageSchema = z.object({
  id: z.string().uuid(),
  cycle_id: z.string().uuid(),
  stage_name: z.string(),
  phase_number: z.number().int(),
  sequence_order: z.number().int(),
  status: StageStatus,
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  duration_ms: z.number().int().nullable().optional(),
  items_processed: z.number().int().default(0),
  is_recoverable: z.boolean().default(true),
  error: z.string().nullable().optional(),
  output: z.record(z.any()).default({}),
  created_at: z.string(),
});
export type CycleStage = z.infer<typeof CycleStageSchema>;

// 9. Runtime Notification Schema
export const RuntimeNotificationSeverity = z.enum(["INFO", "WARNING", "CRITICAL", "EMERGENCY"]);
export type RuntimeNotificationSeverity = z.infer<typeof RuntimeNotificationSeverity>;

export const RuntimeNotificationSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  severity: RuntimeNotificationSeverity,
  title: z.string(),
  message: z.string(),
  source_module: z.string(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.string().nullable().optional(),
  is_acknowledged: z.boolean().default(false),
  acknowledged_at: z.string().nullable().optional(),
  acknowledged_by: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  created_at: z.string(),
});
export type RuntimeNotification = z.infer<typeof RuntimeNotificationSchema>;

// 10. Resource Usage Snapshot
export const ResourceUsageLogSchema = z.object({
  id: z.string().uuid(),
  recorded_at: z.string(),
  active_workers: z.number().int().default(0),
  active_jobs: z.number().int().default(0),
  queued_jobs: z.number().int().default(0),
  dead_letter_jobs: z.number().int().default(0),
  ai_active_requests: z.number().int().default(0),
  research_active_requests: z.number().int().default(0),
  concurrency_saturation_percent: z.number().default(0),
  avg_job_duration_ms: z.number().int().default(0),
  metadata: z.record(z.any()).default({}),
});
export type ResourceUsageLog = z.infer<typeof ResourceUsageLogSchema>;

// 11. Cross-Phase Adapter Results
export interface CrossPhaseAdapterResult {
  success: boolean;
  phase: number;
  adapter_name: string;
  items_processed: number;
  status: "SUCCESS" | "NOTHING_ELIGIBLE" | "REQUIRES_APPROVAL" | "REQUIRES_MANUAL_SETUP" | "NOT_CONNECTED" | "FAILED" | "DRY_RUN";
  details: Record<string, any>;
  error?: string | null;
}

export interface GovernorCheckResult {
  allowed: boolean;
  reason?: string;
  activeGlobalCount: number;
  activeDomainCount: number;
  retryAfterMs?: number;
}
