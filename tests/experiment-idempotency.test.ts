import { describe, it, expect } from "vitest";
import { generateExperimentProposal } from "@/validation/experiment-proposal";

describe("Experiment Engine — Idempotency & Proposal Deduplication", () => {
  it("produces identical hypothesis and parameters for identical opportunity input", () => {
    const input = {
      title: "Automated Error Triage Bot",
      target_customer: "DevOps engineers",
      source: "github",
    };

    const p1 = generateExperimentProposal(input);
    const p2 = generateExperimentProposal(input);

    expect(p1.hypothesis).toBe(p2.hypothesis);
    expect(p1.test_type).toBe(p2.test_type);
    expect(p1.cost_estimate_inr).toBe(0);
    expect(p2.cost_estimate_inr).toBe(0);
    expect(p1.primary_metric).toBe(p2.primary_metric);
  });
});
