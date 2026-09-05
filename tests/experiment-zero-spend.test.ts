import { describe, it, expect } from "vitest";
import { canExecute } from "@/experiments/guard";

describe("Experiment Engine — Zero-Spend Policy Verification", () => {
  it("approves genuine ₹0 experiment with safe reversible local setup", () => {
    const result = canExecute({
      title: "Open Source Tooling Waitlist",
      hypothesis: "Developers will join the waitlist when presented with a free CLI utility.",
      estimated_cost_inr: 0,
      experiment_type: "WAITLIST",
      channel: "GitHub Discussions & Reddit",
    });

    expect(result.allowed).toBe(true);
    expect(result.classification).toBe("FREE");
    expect(result.requires_human_approval).toBe(false);
  });

  it("requires approval if any spending is proposed (e.g. ₹100 domain registration)", () => {
    const result = canExecute({
      title: "Domain Test",
      estimated_cost_inr: 100,
      experiment_type: "LANDING_PAGE",
    });

    expect(result.allowed).toBe(false);
    expect(result.classification).toBe("REQUIRES_APPROVAL");
    expect(result.requires_human_approval).toBe(true);
  });

  it("permanently blocks deceptive or prohibited campaigns", () => {
    const result = canExecute({
      title: "Fake review generation and bot accounts",
      estimated_cost_inr: 0,
      experiment_type: "COMMUNITY_TEST",
    });

    expect(result.allowed).toBe(false);
    expect(result.classification).toBe("BLOCKED");
  });
});
