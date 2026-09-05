import { describe, it, expect } from "vitest";
import {
  CreateApprovalSchema,
  ApproveInputSchema,
  RejectInputSchema,
  ApprovalSchema,
} from "@/types/approval";

describe("Approval Schemas & Validation", () => {
  it("validates valid approval creation input", () => {
    const valid = {
      action_type: "domain_purchase",
      action_description: "Purchase example.com for market validation",
      reason: "Brand identity test",
      estimated_cost_inr: 999,
      risk_level: "low" as const,
      expected_benefit: "High conversion on branded domain",
      requested_by: "agent-growth",
    };

    const parsed = CreateApprovalSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects negative estimated cost", () => {
    const invalid = {
      action_type: "domain_purchase",
      action_description: "Invalid cost test",
      estimated_cost_inr: -100,
    };
    expect(CreateApprovalSchema.safeParse(invalid).success).toBe(false);
  });

  it("validates approve input requires approved_by string", () => {
    expect(ApproveInputSchema.safeParse({ approved_by: "owner" }).success).toBe(true);
    expect(ApproveInputSchema.safeParse({ approved_by: "" }).success).toBe(false);
  });

  it("validates reject input requires rejected_by and rejection_reason", () => {
    expect(
      RejectInputSchema.safeParse({
        rejected_by: "owner",
        rejection_reason: "Too expensive for zero-spend phase",
      }).success
    ).toBe(true);

    expect(
      RejectInputSchema.safeParse({
        rejected_by: "owner",
        rejection_reason: "",
      }).success
    ).toBe(false);
  });

  it("validates full ApprovalSchema", () => {
    const approval = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      action_type: "ad_campaign",
      action_description: "Launch Instagram ad",
      estimated_cost_inr: 500,
      risk_level: "medium" as const,
      status: "PENDING" as const,
      requested_by: "experiment-agent",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const parsed = ApprovalSchema.safeParse(approval);
    expect(parsed.success).toBe(true);
  });
});
