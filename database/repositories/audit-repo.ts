import { query, queryOne, queryMany } from "../client";
import type { CreateAuditLogInput, AuditLog } from "@/types/audit";

const VALID_EVENT_TYPES = new Set([
  "OPPORTUNITY_CREATED", "OPPORTUNITY_UPDATED", "OPPORTUNITY_DELETED", "OPPORTUNITY_SCORED",
  "DECISION_CREATED",
  "APPROVAL_REQUESTED", "APPROVAL_APPROVED", "APPROVAL_REJECTED",
  "ACTION_BLOCKED",
  "EXPERIMENT_CREATED", "EXPERIMENT_UPDATED",
  "PRODUCT_CREATED",
  "AUTOMATION_STARTED", "AUTOMATION_COMPLETED", "AUTOMATION_FAILED",
]);

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const isValid = VALID_EVENT_TYPES.has(input.event_type);
  const normalizedType = isValid ? input.event_type : "DECISION_CREATED";
  const details = isValid
    ? input.details ?? {}
    : { ...(input.details ?? {}), original_event_type: input.event_type };

  const row = await queryOne<AuditLog>(
    `INSERT INTO audit_logs (event_type, entity_type, entity_id, actor, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      normalizedType,
      input.entity_type,
      input.entity_id ?? null,
      input.actor ?? "system",
      JSON.stringify(details),
      input.ip_address ?? null,
    ]
  );
  return row!;
}

export async function listAuditLogs(options?: {
  event_type?: string;
  entity_type?: string;
  entity_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.event_type) {
    conditions.push(`event_type = $${paramIdx++}`);
    params.push(options.event_type);
  }
  if (options?.entity_type) {
    conditions.push(`entity_type = $${paramIdx++}`);
    params.push(options.entity_type);
  }
  if (options?.entity_id) {
    conditions.push(`entity_id = $${paramIdx++}`);
    params.push(options.entity_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs ${where}`,
    params
  );
  const total = parseInt(countResult?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const logs = await queryMany<AuditLog>(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { logs, total };
}

export async function logAudit(input: {
  entity_type: string;
  entity_id?: string | null;
  action?: string;
  event_type?: string;
  actor?: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return createAuditLog({
    event_type: (input.action ?? input.event_type ?? "ACTION_LOGGED") as any,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? undefined,
    actor: input.actor ?? "system",
    details: input.details,
  });
}

