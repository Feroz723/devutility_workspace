import { z } from "zod";

// ===== Provider Status =====
export type ProviderStatus =
  | "READY"
  | "CONNECTED"
  | "NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "FAILED"
  | "DISABLED";

export interface ProviderInfo {
  name: string;
  id: string;
  status: ProviderStatus;
  isFree: boolean;
  rateLimit?: string;
  lastRun?: string;
  lastSuccess?: string;
  lastError?: string;
  configurationRequired?: string;
}

// ===== Raw Research Content =====
export interface RawResearchItem {
  id: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  title: string;
  content: string;
  author?: string;
  publishedAt?: string;
  score?: number;
  commentsCount?: number;
  rawMetadata?: Record<string, unknown>;
}

// ===== Evidence Specifications =====
export type EvidenceNature = "DIRECT" | "INFERRED" | "AI_INTERPRETATION";
export type EvidenceStrength = "LOW" | "MEDIUM" | "HIGH";
export type SourceQuality = "PRIMARY" | "SECONDARY" | "LOWER_CONFIDENCE";

export const ExtractedEvidenceSchema = z.object({
  source_type: z.string(),
  source_name: z.string(),
  source_url: z.string().url().or(z.string()),
  evidence_text: z.string().min(1),
  evidence_strength: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  evidence_nature: z.enum(["DIRECT", "INFERRED", "AI_INTERPRETATION"]).default("DIRECT"),
  source_quality: z.enum(["PRIMARY", "SECONDARY", "LOWER_CONFIDENCE"]).default("PRIMARY"),
  metadata: z.record(z.unknown()).optional(),
});
export type ExtractedEvidence = z.infer<typeof ExtractedEvidenceSchema>;

// ===== Structured Extraction Output =====
export const CandidateOpportunitySchema = z.object({
  title: z.string().min(3).max(500),
  problem: z.string().min(5),
  target_customer: z.string().min(3),
  target_market: z.string().optional(),
  existing_solutions: z.array(z.string()).optional().default([]),
  suggested_solution: z.string().optional(),
  monetization_model: z.string().optional(),
  monetization_confidence: z.enum(["EVIDENCE-BACKED", "INFERRED", "SPECULATIVE"]).default("INFERRED"),
  
  // Scoring factor recommendations from evidence
  demand_factor: z.number().min(0).max(100).default(50),
  competition_factor: z.number().min(0).max(100).default(50),
  monetization_factor: z.number().min(0).max(100).default(50),
  automation_factor: z.number().min(0).max(100).default(50),
  zero_cost_factor: z.number().min(0).max(100).default(50),
  factor_reasoning: z.record(z.string()).optional(),

  // Extracted Evidence items
  evidence: z.array(ExtractedEvidenceSchema).min(1),
  primary_source_url: z.string().optional(),
});
export type CandidateOpportunity = z.infer<typeof CandidateOpportunitySchema>;

// ===== Research Provider Interface =====
export interface ResearchProvider {
  readonly id: string;
  readonly name: string;
  readonly isFree: boolean;
  
  getStatus(): Promise<ProviderStatus>;
  getInfo(): Promise<ProviderInfo>;
  search(query: string, options?: { limit?: number }): Promise<RawResearchItem[]>;
  fetch(url: string): Promise<string | null>;
  normalize(raw: unknown): RawResearchItem[];
  testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }>;
}

// ===== Research Cycle & Job =====
export interface ResearchCycleOptions {
  queries?: string[];
  providers?: string[];
  maxItemsPerQuery?: number;
  triggerSource?: "manual" | "scheduled" | "api";
}

export interface ResearchCycleResult {
  runId: string;
  status: "completed" | "failed";
  queriesExecuted: string[];
  providersUsed: string[];
  rawItemsFound: number;
  opportunitiesCreated: number;
  opportunitiesUpdated: number;
  evidenceCollected: number;
  durationMs: number;
  errors: string[];
  costClassification: "FREE" | "REQUIRES_APPROVAL" | "BLOCKED";
}
