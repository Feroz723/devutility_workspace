import { describe, it, expect } from "vitest";
import { AuditEventType, AuditLogSchema } from "@/types/audit";

describe("Audit Log Validation", () => {
  it("contains all expected system event types", () => {
    const expectedEvents = [
      "OPPORTUNITY_CREATED",
      "OPPORTUNITY_UPDATED",
      "OPPORTUNITY_DELETED",
      "OPPORTUNITY_SCORED",
      "DECISION_CREATED",
      "APPROVAL_REQUESTED",
      "APPROVAL_APPROVED",
      "APPROVAL_REJECTED",
      "ACTION_BLOCKED",
      "EXPERIMENT_CREATED",
      "EXPERIMENT_UPDATED",
      "PRODUCT_CREATED",
      "AUTOMATION_STARTED",
      "AUTOMATION_COMPLETED",
      "AUTOMATION_FAILED",
    ];

    for (const evt of expectedEvents) {
      expect(AuditEventType.safeParse(evt).success).toBe(true);
    }
  });

  it("validates a complete audit log entry", () => {
    const log = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      event_type: "OPPORTUNITY_SCORED",
      entity_type: "opportunity",
      entity_id: "123e4567-e89b-12d3-a456-426614174001",
      actor: "decision-engine",
      details: {
        overall_score: 85,
        decision: "TEST",
      },
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString(),
    };

    const parsed = AuditLogSchema.safeParse(log);
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown event types", () => {
    expect(AuditEventType.safeParse("UNKNOWN_EVENT").success).toBe(false);
  });
});
