import type {
  ScenarioId,
  ScenarioCategory,
  ScenarioStatus,
  SafetyInvariantCheck,
  StateTransitionItem,
  EvidenceFlowItem,
  StrategyDecisionTrace,
} from "@/types/reality-test";

export type { ScenarioId, ScenarioCategory, ScenarioStatus };

export interface ScenarioAuditLogEntry {
  phase: string;
  stepName: string;
  action: string;
  decision?: string;
  evidenceSummary?: string;
  stateTransition?: string;
  safetyDecision?: string;
  approvalRequirement?: string;
  executionResult?: "SUCCESS" | "FAILED" | "BLOCKED" | "SKIPPED";
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  errorDetail?: string;
}

export interface ScenarioExecutionOutput {
  scenarioId: ScenarioId;
  scenarioName: string;
  category: ScenarioCategory;
  status: ScenarioStatus;
  durationMs: number;
  errorMessage?: string | null;
  primaryBottleneck?: string | null;
  strategyDecision?: string | null;
  whatWaitingFor?: string | null;
  humanApprovalRequired: boolean;
  safetyInvariantsVerified: SafetyInvariantCheck[];
  stateTransitions: StateTransitionItem[];
  evidenceFlow: EvidenceFlowItem[];
  executionTrace: Array<{
    phase: string;
    step: string;
    status: string;
    detail: string;
  }>;
  strategyTrace?: StrategyDecisionTrace;
  auditLogs: ScenarioAuditLogEntry[];
  rawOutput: Record<string, unknown>;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  category: ScenarioCategory;
  description: string;
  run: (runId: string) => Promise<ScenarioExecutionOutput>;
}
