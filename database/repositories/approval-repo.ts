import { queryOne, queryMany } from "../client";
import type { Approval, CreateApprovalInput } from "@/types/approval";

export async function createApproval(input: CreateApprovalInput): Promise<Approval> {
  const row = await queryOne<Approval>(
    `INSERT INTO approvals (
      action_type, action_description, reason, estimated_cost_inr,
      risk_level, expected_benefit, related_opportunity_id,
      related_experiment_id, requested_by, metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      input.action_type,
      input.action_description,
      input.reason ?? null,
      input.estimated_cost_inr ?? 0,
      input.risk_level ?? "low",
      input.expected_benefit ?? null,
      input.related_opportunity_id ?? null,
      input.related_experiment_id ?? null,
      input.requested_by ?? "system",
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  return row!;
}

export async function getApprovalById(id: string): Promise<Approval | null> {
  return queryOne<Approval>("SELECT * FROM approvals WHERE id = $1", [id]);
}

export async function listApprovals(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ approvals: Approval[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM approvals ${where}`,
    params
  );
  const total = parseInt(countResult?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const approvals = await queryMany<Approval>(
    `SELECT * FROM approvals ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { approvals, total };
}

export async function approveApproval(
  id: string,
  approved_by: string
): Promise<Approval | null> {
  // First check current state
  const current = await getApprovalById(id);
  if (!current) return null;
  if (current.status !== "PENDING") {
    throw new Error(`Cannot approve: approval is already ${current.status}`);
  }

  return queryOne<Approval>(
    `UPDATE approvals SET
      status = 'APPROVED',
      approved_by = $2,
      approved_at = now(),
      updated_at = now()
    WHERE id = $1 AND status = 'PENDING'
    RETURNING *`,
    [id, approved_by]
  );
}

export async function rejectApproval(
  id: string,
  rejected_by: string,
  rejection_reason: string
): Promise<Approval | null> {
  const current = await getApprovalById(id);
  if (!current) return null;
  if (current.status !== "PENDING") {
    throw new Error(`Cannot reject: approval is already ${current.status}`);
  }

  return queryOne<Approval>(
    `UPDATE approvals SET
      status = 'REJECTED',
      approved_by = $2,
      rejected_at = now(),
      rejection_reason = $3,
      updated_at = now()
    WHERE id = $1 AND status = 'PENDING'
    RETURNING *`,
    [id, rejected_by, rejection_reason]
  );
}
