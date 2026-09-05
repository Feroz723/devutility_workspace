import { describe, it, expect } from "vitest";
import { checkProductBuildEligibility } from "@/product-builder/eligibility";
import type { Experiment, ExperimentMetric } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";

describe("Product Build Eligibility Rules", () => {
  const baseExperiment: Experiment = {
    id: "exp-12345678-1234-1234-1234-123456789012",
    opportunity_id: "opp-12345678-1234-1234-1234-123456789012",
    title: "GST Invoice Generator Experiment",
    description: "Validate demand for an instant browser-based GST invoice calculator",
    hypothesis: "Small freelancers need a 1-click GST calculator without logging in",
    status: "COMPLETED",
    result: "WINNER",
    cost_inr: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: false,
    stage: "SETUP",
  } as unknown as Experiment;

  const baseOpportunity: Opportunity = {
    id: "opp-12345678-1234-1234-1234-123456789012",
    title: "Instant GST Invoice Tool",
    description: "High search volume for quick GST calculations in India",
    status: "validated",
    confidence_score: 85,
    validation_score: 88,
    feasibility_score: 90,
    target_audience: "Freelancers and SMBs in India",
    problem_statement: "Existing tools force signups and payment before calculating tax",
    value_proposition: "100% free, client-side GST calculator",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_demo: false,
  } as unknown as Opportunity;

  const validMetrics: ExperimentMetric[] = [
    {
      id: "m-1",
      experiment_id: baseExperiment.id,
      metric_name: "visitors",
      metric_value: 120,
      source: "ANALYTICS",
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: "m-2",
      experiment_id: baseExperiment.id,
      metric_name: "conversions",
      metric_value: 18,
      source: "ANALYTICS",
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  it("approves a valid winning experiment with real metrics and high validation score", () => {
    const result = checkProductBuildEligibility(baseExperiment, baseOpportunity, {
      metrics: validMetrics,
    });

    expect(result.eligible).toBe(true);
    expect(result.blockers.length).toBe(0);
    expect(result.metrics.experiment_result).toBe("WINNER");
    expect(result.metrics.has_real_users).toBe(true);
  });

  it("approves a promising experiment", () => {
    const promisingExp = { ...baseExperiment, result: "PROMISING" };
    const result = checkProductBuildEligibility(promisingExp, baseOpportunity, {
      metrics: validMetrics,
    });
    expect(result.eligible).toBe(true);
  });

  it("rejects an experiment with pending or failed outcome", () => {
    const failedExp = { ...baseExperiment, result: "STOPPED", status: "STOPPED" as const };
    const result = checkProductBuildEligibility(failedExp, baseOpportunity, {
      metrics: validMetrics,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockers.some((b) => b.includes("Must be WINNER or PROMISING"))).toBe(true);
  });

  it("rejects an experiment that incurred non-zero spend", () => {
    const costlyExp = { ...baseExperiment, cost_inr: 500 };
    const result = checkProductBuildEligibility(costlyExp, baseOpportunity, {
      metrics: validMetrics,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockers.some((b) => b.includes("₹0 budget"))).toBe(true);
  });

  it("rejects when opportunity confidence or validation is too low", () => {
    const lowConfidenceOpp = { ...baseOpportunity, confidence_score: 40, validation_score: 55 };
    const result = checkProductBuildEligibility(baseExperiment, lowConfidenceOpp, {
      metrics: validMetrics,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockers.some((b) => b.includes("Research confidence"))).toBe(true);
    expect(result.blockers.some((b) => b.includes("Validation score"))).toBe(true);
  });

  it("rejects when 0 real user traffic or interactions are recorded in provided metrics", () => {
    const zeroTrafficMetrics: ExperimentMetric[] = [
      {
        id: "m-1",
        experiment_id: baseExperiment.id,
        metric_name: "visitors",
        metric_value: 0,
        source: "MANUAL",
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];
    const result = checkProductBuildEligibility(baseExperiment, baseOpportunity, {
      metrics: zeroTrafficMetrics,
    });
    expect(result.eligible).toBe(false);
    expect(result.blockers.some((b) => b.includes("0 real user traffic"))).toBe(true);
  });
});
