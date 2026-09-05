export interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  status: "PLANNED" | "STUBBED" | "ENABLED";
}

export interface ResearchFinding {
  source: string;
  title: string;
  url?: string;
  notes?: string;
  collectedAt: string;
}

export interface OpportunityCandidate {
  id: string;
  title: string;
  summary: string;
  demandSignals: string[];
  riskLevel: "low" | "medium" | "high";
}

export type DecisionAction =
  | { kind: "NOOP" }
  | { kind: "REQUEST_APPROVAL"; requestId: string }
  | { kind: "PROCEED"; reason: string };

export interface DecisionResult {
  action: DecisionAction;
  rationale: string;
}

export interface AutomationEvent {
  id: string;
  source: string;
  type: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}