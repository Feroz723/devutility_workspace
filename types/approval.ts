import { z } from "zod";

export const ApprovalStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

export const ApprovalSchema = z.object({
  id: z.string().uuid(),
  action_type: z.string(),
  action_description: z.string(),
  reason: z.string().nullable().optional(),
  estimated_cost_inr: z.number().nonnegative(),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  expected_benefit: z.string().nullable().optional(),
  related_opportunity_id: z.string().uuid().nullable().optional(),
  related_experiment_id: z.string().uuid().nullable().optional(),
  status: ApprovalStatus,
  requested_by: z.string(),
  approved_by: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  rejected_at: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  metadata: z.any().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const CreateApprovalSchema = z.object({
  action_type: z.string().min(1).max(200),
  action_description: z.string().min(1).max(2000),
  reason: z.string().optional(),
  estimated_cost_inr: z.number().nonnegative().optional(),
  risk_level: z.enum(["low", "medium", "high", "critical"]).optional(),
  expected_benefit: z.string().optional(),
  related_opportunity_id: z.string().uuid().optional(),
  related_experiment_id: z.string().uuid().optional(),
  requested_by: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateApprovalInput = z.infer<typeof CreateApprovalSchema>;

export const ApproveInputSchema = z.object({
  approved_by: z.string().min(1),
});
export type ApproveInput = z.infer<typeof ApproveInputSchema>;

export const RejectInputSchema = z.object({
  rejected_by: z.string().min(1),
  rejection_reason: z.string().min(1).max(2000),
});
export type RejectInput = z.infer<typeof RejectInputSchema>;
