import { describe, it, expect, vi } from "vitest";
import {
  initializeCustomerOnboarding,
  advanceOnboardingStep,
  getNextRecommendedAction,
} from "@/customer-success/onboarding";
import * as csRepo from "@/database/repositories/customer-success-repo";

describe("Customer Success - Onboarding", () => {
  it("initializes onboarding checklist with progressive steps", async () => {
    vi.spyOn(csRepo, "getCustomerOnboarding").mockResolvedValueOnce(null);
    const upsertSpy = vi.spyOn(csRepo, "upsertCustomerOnboarding").mockResolvedValueOnce({
      id: "onb-1",
      customer_id: "c-1",
      product_id: "p-1",
      steps: [
        { id: "step_welcome", title: "Access Workspace", completed: false },
        { id: "step_setup", title: "Initial Config", completed: false },
      ],
      current_step_index: 0,
      is_completed: false,
    } as any);

    const onboarding = await initializeCustomerOnboarding("c-1", "p-1");
    expect(upsertSpy).toHaveBeenCalled();
    expect(onboarding.is_completed).toBe(false);
  });

  it("advances step and recommends next pending action", async () => {
    vi.spyOn(csRepo, "getCustomerOnboarding").mockResolvedValueOnce({
      id: "onb-1",
      customer_id: "c-1",
      product_id: "p-1",
      steps: [
        { id: "step_welcome", title: "Access Workspace", completed: false },
        { id: "step_setup", title: "Initial Config", completed: false },
      ],
      current_step_index: 0,
      is_completed: false,
    } as any);

    vi.spyOn(csRepo, "upsertCustomerOnboarding").mockResolvedValueOnce({
      id: "onb-1",
      customer_id: "c-1",
      product_id: "p-1",
      steps: [
        { id: "step_welcome", title: "Access Workspace", completed: true },
        { id: "step_setup", title: "Initial Config", completed: false },
      ],
      current_step_index: 1,
      is_completed: false,
    } as any);

    const updated = await advanceOnboardingStep("c-1", "p-1", "step_welcome");
    const recommendation = getNextRecommendedAction(updated);

    expect(updated?.current_step_index).toBe(1);
    expect(recommendation.step?.id).toBe("step_setup");
    expect(recommendation.message).toContain("Initial Config");
  });
});
