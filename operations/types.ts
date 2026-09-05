import type {
  OperationsJob,
  OperationsEvent,
  IntegrationHealth,
  SystemState,
  AgentRegistryItem,
  JobStatus,
  FailureClassification,
  SafetyClassification,
  SystemReadinessStatus,
  ActionRecommendation,
  DiagnosticCheckItem,
  UnifiedApprovalItem,
  UnifiedManualActionItem,
} from "@/types/operations";

export * from "@/types/operations";

export interface CycleRunResult {
  cycle_type: "DAILY" | "WEEKLY";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  jobs_executed: number;
  jobs_succeeded: number;
  jobs_failed: number;
  jobs_queued: number;
  readiness_status: SystemReadinessStatus;
  errors: string[];
}

export interface BackupExportData {
  version: string;
  timestamp: string;
  checksum_sha256: string;
  system_state: SystemState;
  agents: AgentRegistryItem[];
  integrations: IntegrationHealth[];
  tables: Record<string, any[]>;
}
