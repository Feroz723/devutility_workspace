import { describe, it, expect, vi } from "vitest";
import { verifyCustomerOutcome, getProductOutcomeSummary } from "@/customer-success/outcomes";
import { detectProductLearningSignals } from "@/customer-success/product-signals";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Outcomes & Product Signals", () => {
  it("verifies problem-solving outcome status based on milestone progress", async () => {
    vi.spyOn(csRepo, "listCustomerGoals").mockResolvedValueOnce([
      {
        id: "g-1",
        customer_id: "c-1",
        product_id: "p-1",
        title: "Export Quarterly Tax Ledger",
        completion_status: "ACHIEVED",
        progress_percent: 100,
      } as any,
    ]);

    vi.spyOn(csRepo, "listCustomerMilestones").mockResolvedValueOnce([
      { id: "m-1", name: "Ledger Generated", is_completed: true } as any,
    ]);

    const outcome = await verifyCustomerOutcome("c-1", "p-1");
    expect(outcome.status).toBe("ACHIEVED");
    expect(outcome.progress_percent).toBe(100);
    expect(outcome.completed_milestones).toContain("Ledger Generated");
  });

  it("detects product learning signals with REQUIRES_REVIEW status for Phase 6 product evolution", async () => {
    vi.spyOn(csRepo, "listCustomerFeedback").mockResolvedValueOnce([
      { feedback_type: "FEATURE_REQUEST" },
      { feedback_type: "FEATURE_REQUEST" },
      { feedback_type: "FEATURE_REQUEST" },
    ] as any);

    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValueOnce([
      { category: "BUG", subject: "Export fails" },
      { category: "BUG", subject: "Export 500 crash" },
    ] as any);

    vi.spyOn(csRepo, "listCustomerActivations").mockResolvedValueOnce([
      { status: "STALLED" },
      { status: "STALLED" },
    ] as any);

    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);

    const signals = await detectProductLearningSignals("prod-1");
    expect(signals.length).toBeGreaterThanOrEqual(2);
    expect(signals.every((s) => s.status === "REQUIRES_REVIEW")).toBe(true);

    const bugCluster = signals.find((s) => s.signal_type === "BUG_CLUSTER");
    expect(bugCluster).toBeDefined();

    const friction = signals.find((s) => s.signal_type === "USABILITY_FRICTION");
    expect(friction).toBeDefined();
  });
});
