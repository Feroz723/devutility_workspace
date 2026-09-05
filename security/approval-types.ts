import { z } from "zod";

export const SENSITIVE_ACTION_CATEGORIES = [
  "payment",
  "advertising",
  "domain_purchase",
  "subscription",
  "financial_transaction",
  "account_action",
  "irreversible_external"
] as const;

export type SensitiveActionCategory =
  (typeof SENSITIVE_ACTION_CATEGORIES)[number];

export const SensitiveActionRequestSchema = z.object({
  id: z.string().min(1),
  category: z.enum(SENSITIVE_ACTION_CATEGORIES),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  estimatedCostCents: z.number().int().nonnegative().default(0),
  vendor: z.string().optional(),
  reversible: z.boolean().default(false),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

export type SensitiveActionRequest = z.infer<typeof SensitiveActionRequestSchema>;

export const ApprovalDecisionSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  decidedBy: z.string().min(1),
  decidedAt: z.string().datetime(),
  reason: z.string().max(1000).optional()
});

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;