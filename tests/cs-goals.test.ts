import { describe, it, expect, vi } from "vitest";
import { setupCustomerGoal, completeMilestone } from "@/customer-success/goals";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Goals", () => {
  it("creates goal and defaults to 3 sequential milestones", async () => {
    vi.spyOn(csRepo, "createCustomerGoal").mockResolvedValueOnce({
      id: "g-1",
      customer_id: "c-1",
      product_id: "p-1",
      title: "Automate Monthly Invoicing",
      completion_status: "IN_PROGRESS",
      progress_percent: 0,
    } as any);

    const milestoneSpy = vi.spyOn(csRepo, "createCustomerMilestone").mockResolvedValue({
      id: "m-1",
      goal_id: "g-1",
      name: "Setup",
      sequence_order: 1,
      is_completed: false,
    } as any);

    const result = await setupCustomerGoal({
      customer_id: "c-1",
      product_id: "p-1",
      title: "Automate Monthly Invoicing",
    });

    expect(result.goal.id).toBe("g-1");
    expect(result.milestones.length).toBe(3);
    expect(milestoneSpy).toHaveBeenCalledTimes(3);
  });

  it("updates goal completion_status to ACHIEVED when 100% of milestones are done", async () => {
    vi.spyOn(csRepo, "updateCustomerMilestone").mockResolvedValueOnce({
      id: "m-2",
      goal_id: "g-1",
      is_completed: true,
    } as any);

    vi.spyOn(csRepo, "listCustomerMilestones").mockResolvedValueOnce([
      { id: "m-1", goal_id: "g-1", is_completed: true } as any,
      { id: "m-2", goal_id: "g-1", is_completed: true } as any,
    ]);

    const updateGoalSpy = vi.spyOn(csRepo, "updateCustomerGoal").mockResolvedValueOnce({
      id: "g-1",
      customer_id: "c-1",
      title: "Automate Monthly Invoicing",
      completion_status: "ACHIEVED",
      progress_percent: 100,
    } as any);

    vi.spyOn(csRepo, "upsertCustomerProfile").mockResolvedValueOnce({} as any);
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValueOnce({} as any);

    const { goal } = await completeMilestone("m-2");
    expect(updateGoalSpy).toHaveBeenCalledWith("g-1", {
      progress_percent: 100,
      completion_status: "ACHIEVED",
      achieved_at: expect.any(String),
    });
    expect(goal?.completion_status).toBe("ACHIEVED");
  });
});
