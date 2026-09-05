import { z } from "zod";

// 1. Job Statuses
export const JobStatus = z.enum([
  "PLANNED",
  "QUEUED",
  "RUNNING",
  "WAITING",
  "SUCCEEDED",
  "FAILED",
  "RETRYING",
  "DEAD_LETTER",
  "BLOCKED",
  "PAUSED",
  "CANCELLED",
  "REQUIRES_APPROVAL",
  "REQUIRES_MANUAL_SETUP",
]);
export type JobStatus = z.infer<typeof JobStatus>;

// 2. Failure Classifications
export const FailureClassification = z.enum([
  "TRANSIENT",
  "CONFIGURATION",
  "AUTHENTICATION",
  "RATE_LIMIT",
  "VALIDATION",
  "SECURITY",
  "BUSINESS_RULE",
  "MANUAL_SETUP",
  "PERMANENT",
]);
export type FailureClassification = z.infer<typeof FailureClassification>;

// 3. Safety Classifications
export const SafetyClassification = z.enum([
  "ZERO_COST_AUTO",
  "SENSITIVE_REVIEW",
  "FINANCIAL_APPROVAL",
  "PROHIBITED",
]);
export type SafetyClassification = z.infer<typeof SafetyClassification>;

// 4. Retry Policy
export const JobRetryPolicySchema = z.object({
  max_attempts: z.number().int().min(1).default(3),
  backoff_base_ms: z.number().int().min(100).default(1000),
  backoff_factor: z.number().min(1).default(2),
  max_backoff_ms: z.number().int().min(1000).default(30000),
});
export type JobRetryPolicy = z.infer<typeof JobRetryPolicySchema>;

// 5. Operations Job
export const OperationsJobSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  module: z.string(),
  action: z.string(),
  status: JobStatus,
  idempotency_key: z.string(),
  depends_on: z.array(z.string()).default([]),
  blocks: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(100).default(50),
  retry_policy: JobRetryPolicySchema,
  attempts: z.number().int().min(0).default(0),
  max_attempts: z.number().int().min(1).default(3),
  failure_classification: FailureClassification.nullable().optional(),
  last_error: z.string().nullable().optional(),
  error_stack: z.string().nullable().optional(),
  timeout_seconds: z.number().int().default(300),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  next_run_at: z.string().nullable().optional(),
  required_approval: z.boolean().default(false),
  approval_id: z.string().uuid().nullable().optional(),
  required_integration: z.string().nullable().optional(),
  resource_requirement: z.record(z.any()).default({ time_weight: 1, compute_weight: 1 }),
  safety_classification: SafetyClassification.default("ZERO_COST_AUTO"),
  payload: z.record(z.any()).default({}),
  result: z.record(z.any()).nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type OperationsJob = z.infer<typeof OperationsJobSchema>;

// 6. Job History Entry
export const OperationsJobHistorySchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  attempt_number: z.number().int(),
  status: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  duration_ms: z.number().int().nullable().optional(),
  error: z.string().nullable().optional(),
  output: z.record(z.any()).nullable().optional(),
  created_at: z.string(),
});
export type OperationsJobHistory = z.infer<typeof OperationsJobHistorySchema>;

// 7. Operations Event
export const OperationsEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.string(),
  source_module: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  correlation_id: z.string().nullable().optional(),
  causation_id: z.string().nullable().optional(),
  payload: z.record(z.any()).default({}),
  timestamp: z.string(),
  is_demo: z.boolean().default(false),
});
export type OperationsEvent = z.infer<typeof OperationsEventSchema>;

// 8. Integration Health
export const IntegrationConnectionStatus = z.enum([
  "NOT_CONNECTED",
  "REQUIRES_MANUAL_SETUP",
  "CONFIGURED_TEST",
  "CONFIGURED_LIVE",
  "HEALTHY",
  "DEGRADED",
  "FAILED",
  "BLOCKED",
]);
export type IntegrationConnectionStatus = z.infer<typeof IntegrationConnectionStatus>;

export const IntegrationHealthSchema = z.object({
  provider: z.string(),
  category: z.string(),
  capabilities: z.array(z.string()).default([]),
  connection_status: IntegrationConnectionStatus,
  last_successful_check: z.string().nullable().optional(),
  last_failure: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  required_env_vars: z.array(z.string()).default([]),
  manual_setup_instructions: z.string().nullable().optional(),
  latency_ms: z.number().int().nullable().optional(),
  updated_at: z.string(),
});
export type IntegrationHealth = z.infer<typeof IntegrationHealthSchema>;

// 9. System State & Readiness
export const SystemReadinessStatus = z.enum([
  "SYSTEM_READY",
  "SYSTEM_PARTIALLY_READY",
  "SYSTEM_NOT_READY",
  "SYSTEM_BLOCKED",
]);
export type SystemReadinessStatus = z.infer<typeof SystemReadinessStatus>;

export const SystemStateSchema = z.object({
  id: z.string(),
  readiness_status: SystemReadinessStatus,
  readiness_reasons: z.array(z.string()).default([]),
  is_paused: z.boolean().default(false),
  pause_reason: z.string().nullable().optional(),
  is_kill_switch_active: z.boolean().default(false),
  kill_switch_triggered_at: z.string().nullable().optional(),
  kill_switch_reason: z.string().nullable().optional(),
  active_cycle: z.enum(["DAILY", "WEEKLY", "IDLE"]).default("IDLE"),
  last_daily_cycle_at: z.string().nullable().optional(),
  last_weekly_cycle_at: z.string().nullable().optional(),
  spending_limit_inr: z.number().default(0),
  metadata: z.record(z.any()).default({}),
  updated_at: z.string(),
});
export type SystemState = z.infer<typeof SystemStateSchema>;

// 10. Autonomous Agent Registry
export const AgentStatus = z.enum([
  "ACTIVE",
  "PAUSED",
  "DEGRADED",
  "FAILED",
  "BLOCKED",
  "REQUIRES_MANUAL_SETUP",
]);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const AgentRegistryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase_number: z.number().int(),
  capabilities: z.array(z.string()).default([]),
  status: AgentStatus,
  last_execution_at: z.string().nullable().optional(),
  last_success_at: z.string().nullable().optional(),
  last_failure_at: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  dependencies: z.array(z.string()).default([]),
  configuration: z.record(z.any()).default({}),
  updated_at: z.string(),
});
export type AgentRegistryItem = z.infer<typeof AgentRegistryItemSchema>;

// 11. System Backups
export const BackupType = z.enum(["FULL", "CONFIG_ONLY", "AUDIT_ONLY", "BUSINESS_DATA"]);
export type BackupType = z.infer<typeof BackupType>;

export const SystemBackupSchema = z.object({
  id: z.string().uuid(),
  backup_type: BackupType,
  file_path: z.string(),
  file_size_bytes: z.number().int(),
  checksum_sha256: z.string(),
  includes_secrets: z.boolean().default(false),
  status: z.enum(["COMPLETED", "FAILED", "RESTORING", "RESTORED"]),
  metadata: z.record(z.any()).default({}),
  created_at: z.string(),
});
export type SystemBackup = z.infer<typeof SystemBackupSchema>;

// 12. Unified Approval Item
export interface UnifiedApprovalItem {
  id: string;
  action_type: string;
  action_description: string;
  originating_module: string;
  entity_type: string;
  entity_id?: string;
  expected_effect?: string;
  estimated_cost_inr: number;
  risk_level: "low" | "medium" | "high" | "critical";
  evidence_summary?: string;
  requires_approval: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

// 13. Unified Manual Action Item
export interface UnifiedManualActionItem {
  id: string;
  title: string;
  module: string;
  category: "INTEGRATION" | "AUTHENTICATION" | "DOMAIN" | "DEPLOYMENT" | "PAYMENT" | "CONTENT";
  what: string;
  why: string;
  where_location: string;
  how_instructions: string;
  status: "REQUIRES_MANUAL_SETUP" | "NOT_CONNECTED" | "REQUIRES_APPROVAL" | "COMPLETED";
  required_keys?: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
}

// 14. Command Center Recommendation ("What Should I Do Now?")
export interface ActionRecommendation {
  priority: number; // 1 = highest
  category: "APPROVAL" | "MANUAL_SETUP" | "DEAD_LETTER_JOB" | "BUSINESS_RISK" | "EXPERIMENT" | "SYSTEM_READINESS";
  title: string;
  action: string;
  reason: string;
  target_url: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

// 15. Diagnostic Check Item
export interface DiagnosticCheckItem {
  id: string;
  name: string;
  category: "DATABASE" | "MIGRATIONS" | "ENVIRONMENT" | "INTEGRATIONS" | "JOB_QUEUE" | "SCHEDULER" | "ORCHESTRATOR" | "SAFETY" | "EVENT_BUS";
  status: "PASS" | "WARN" | "FAIL";
  message: string;
  details?: Record<string, any>;
  duration_ms?: number;
}
