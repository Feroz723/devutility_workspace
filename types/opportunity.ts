import { z } from "zod";

// ===== Enums =====

export const OpportunityStatus = z.enum([
  "new", "researching", "scored", "testing", "validated", "rejected", "archived",
]);
export type OpportunityStatus = z.infer<typeof OpportunityStatus>;

export const OpportunityDecision = z.enum(["TEST_CANDIDATE", "TEST", "RESEARCH_MORE", "REJECT", "REQUIRES_APPROVAL", "BLOCKED"]);
export type OpportunityDecision = z.infer<typeof OpportunityDecision>;

export const ValidationStatus = z.enum([
  "UNVALIDATED",
  "RESEARCHING",
  "VALIDATED",
  "TEST_CANDIDATE",
  "REJECTED",
  "REQUIRES_APPROVAL",
]);
export type ValidationStatus = z.infer<typeof ValidationStatus>;

export const HumanInvolvement = z.enum(["none", "minimal", "moderate", "significant"]);
export type HumanInvolvement = z.infer<typeof HumanInvolvement>;

export const RiskLevel = z.enum(["low", "medium", "high", "critical"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

// ===== Score constraint =====
const Score = z.number().int().min(0).max(100);

// ===== Opportunity =====

export const OpportunitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  problem: z.string().nullable().optional(),
  problem_statement: z.string().nullable().optional(),
  target_customer: z.string().nullable().optional(),
  target_market: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  evidence: z.any().optional(),
  demand_score: Score.nullable().optional(),
  competition_score: Score.nullable().optional(),
  monetization_score: Score.nullable().optional(),
  automation_score: Score.nullable().optional(),
  zero_cost_score: Score.nullable().optional(),
  overall_score: Score.nullable().optional(),
  decision: OpportunityDecision.nullable().optional(),
  estimated_revenue: z.string().nullable().optional(),
  estimated_time_to_test: z.string().nullable().optional(),
  human_involvement: HumanInvolvement.nullable().optional(),
  risk_level: RiskLevel.nullable().optional(),
  status: OpportunityStatus,
  is_demo: z.boolean(),
  research_confidence: Score.nullable().optional(),
  evidence_count: z.number().int().nullable().optional(),
  source_count: z.number().int().nullable().optional(),
  last_researched_at: z.string().nullable().optional(),
  research_run_count: z.number().int().nullable().optional(),
  competitors: z.any().optional(),
  monetization_type: z.string().nullable().optional(),
  monetization_confidence: z.enum(["EVIDENCE-BACKED", "INFERRED", "SPECULATIVE"]).nullable().optional(),
  validation_score: Score.nullable().optional(),
  priority_score: Score.nullable().optional(),
  validation_status: ValidationStatus.nullable().optional(),
  customer_profile: z.any().optional(),
  proposed_solution: z.any().optional(),
  experiment_proposal: z.any().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Opportunity = z.infer<typeof OpportunitySchema>;

export const CreateOpportunitySchema = z.object({
  title: z.string().min(1).max(500),
  problem: z.string().optional(),
  problem_statement: z.string().optional(),
  target_customer: z.string().optional(),
  target_market: z.string().optional(),
  source: z.string().optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  evidence: z.any().optional(),
  demand_score: Score.optional(),
  competition_score: Score.optional(),
  monetization_score: Score.optional(),
  automation_score: Score.optional(),
  zero_cost_score: Score.optional(),
  overall_score: Score.optional(),
  decision: OpportunityDecision.optional(),
  estimated_revenue: z.string().optional(),
  estimated_time_to_test: z.string().optional(),
  human_involvement: HumanInvolvement.optional(),
  risk_level: RiskLevel.optional(),
  status: OpportunityStatus.optional(),
  is_demo: z.boolean().optional(),
  research_confidence: Score.optional(),
  evidence_count: z.number().int().optional(),
  source_count: z.number().int().optional(),
  last_researched_at: z.string().optional(),
  research_run_count: z.number().int().optional(),
  competitors: z.any().optional(),
  monetization_type: z.string().optional(),
  monetization_confidence: z.enum(["EVIDENCE-BACKED", "INFERRED", "SPECULATIVE"]).optional(),
  validation_score: Score.optional(),
  priority_score: Score.optional(),
  validation_status: ValidationStatus.optional(),
  customer_profile: z.any().optional(),
  proposed_solution: z.any().optional(),
  experiment_proposal: z.any().optional(),
});
export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;

export const UpdateOpportunitySchema = CreateOpportunitySchema.extend({
  overall_score: Score.nullable().optional(),
  decision: OpportunityDecision.nullable().optional(),
}).partial();
export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunitySchema>;

export const OpportunityFilterSchema = z.object({
  search: z.string().optional(),
  status: OpportunityStatus.optional(),
  min_score: Score.optional(),
  max_score: Score.optional(),
  decision: OpportunityDecision.optional(),
  validation_status: ValidationStatus.optional(),
  is_demo: z.boolean().optional(),
  sort_by: z.enum([
    "created_at",
    "overall_score",
    "validation_score",
    "priority_score",
    "title",
    "status",
    "updated_at",
  ]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type OpportunityFilter = z.infer<typeof OpportunityFilterSchema>;

