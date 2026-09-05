import { z } from "zod";

export const SystemComponentStatusSchema = z.enum([
  "CONNECTED",
  "RUNNING",
  "NOT_CONNECTED",
  "REQUIRES_MANUAL_SETUP",
  "DEGRADED",
  "FAILED",
  "PAUSED",
  "STOPPED",
]);
export type SystemComponentStatus = z.infer<typeof SystemComponentStatusSchema>;

export interface ComponentHealthInfo {
  name: string;
  status: SystemComponentStatus;
  details?: string;
  lastHeartbeat?: string | null;
  lastCycle?: string | null;
  error?: string | null;
  requiresManualAction?: boolean;
}

export interface ActivationControlStatus {
  components: {
    runtime: ComponentHealthInfo;
    database: ComponentHealthInfo;
    research: ComponentHealthInfo;
    ai: ComponentHealthInfo;
    primaryProduct: ComponentHealthInfo;
    deployment: ComponentHealthInfo;
    publicUrl: ComponentHealthInfo;
    analytics: ComponentHealthInfo;
    distribution: ComponentHealthInfo;
    feedback: ComponentHealthInfo;
    strategyGovernor: ComponentHealthInfo;
    payment: ComponentHealthInfo;
    worker: ComponentHealthInfo;
    manualActions: ComponentHealthInfo;
    zeroSpend: ComponentHealthInfo;
  };
  primaryProduct: {
    id: string | null;
    name: string | null;
    slug: string | null;
    status: string | null;
    publicUrl: string | null;
    isVerified: boolean;
    lastActivityAt: string | null;
  };
  strategy: {
    currentStrategy: string | null;
    bottleneck: string | null;
    nextActions: string[];
    waitingFor: string | null;
    confidence: number | null;
    lastRunAt: string | null;
  };
  metrics: {
    backlogCount: number;
    lastResearchRun: string | null;
    lastProductActivity: string | null;
    lastRealUserEvent: string | null;
    realEventsCount: number;
    realFeedbackCount: number;
    realVisitorsCount: number;
  };
  worker: {
    status: "RUNNING" | "DEGRADED" | "PAUSED" | "FAILED" | "STOPPED";
    lastHeartbeat: string | null;
    lastCycle: string | null;
    currentJob: string | null;
    nextScheduledJob: string | null;
    failureCount: number;
    lastError: string | null;
    databaseHealth: "HEALTHY" | "DEGRADED" | "UNREACHABLE";
  };
}

export interface RealCycleStageResult {
  stage: string;
  status: "COMPLETED" | "SKIPPED" | "REQUIRES_MANUAL_SETUP" | "FAILED";
  summary: string;
  details?: Record<string, any>;
  durationMs: number;
}

export interface RealBusinessCycleResult {
  cycleId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  stages: RealCycleStageResult[];
  primaryProduct: {
    id: string | null;
    name: string | null;
    slug: string | null;
    status: string | null;
    publicUrl: string | null;
  };
  realEventsObserved: {
    visitors: number;
    pageViews: number;
    coreActions: number;
    feedbackEntries: number;
  };
  strategyDecision: {
    recommendedStrategy: string;
    primaryBottleneck: string;
    nextActions: string[];
    waitingFor: string;
  } | null;
  zeroSpendEnforced: boolean;
  totalSpendInr: number;
}
