import { describe, it, expect } from "vitest";
import { analyzeExperiment } from "@/experiments/analysis";
import type { Experiment, ExperimentMetric } from "@/types/experiment";

describe("Experiment Engine — Analysis & Result Logic", () => {
  const baseExperiment: Experiment = {
    id: "33333333-3333-3333-3333-333333333333",
    opportunity_id: "44444444-4444-4444-4444-444444444444",
    title: "[₹0 Experiment] Stripe Webhook Monitor",
    experiment_type: "WAITLIST",
    hypothesis: "Developers will join waitlist when offered a zero-cost monitor.",
    problem: "Silent webhook drops",
    solution: "Instant alert script",
    target_customer: "SaaS backend developers",
    channel: "Hacker News & Reddit",
    success_criteria: "10 signups",
    failure_criteria: [{ condition: "Platform restriction", triggered: false }],
    stage: "VALIDATION",
    status: "RUNNING",
    result: null,
    decision: null,
    start_date: "2026-09-01",
    end_date: "2026-09-08",
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    hypothesis_details: {
      target_metrics: [
        { name: "views", target_value: 50 },
        { name: "signups", target_value: 10 },
      ],
    },
  };

  it("declares WINNER when all success criteria targets are met", () => {
    const metrics: ExperimentMetric[] = [
      {
        id: "m1",
        experiment_id: baseExperiment.id,
        metric_name: "views",
        metric_value: 65,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "m2",
        experiment_id: baseExperiment.id,
        metric_name: "signups",
        metric_value: 12,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const result = analyzeExperiment(baseExperiment, metrics);
    expect(result.result).toBe("WINNER");
    expect(result.success_criteria_met).toBe(true);
    expect(result.learnings.what_worked.length).toBeGreaterThan(0);
    expect(result.learnings.recommended_next_action).toContain("Phase 6 Product Builder");
  });

  it("declares PROMISING when meaningful positive signal exists (partial targets met)", () => {
    const metrics: ExperimentMetric[] = [
      {
        id: "m1",
        experiment_id: baseExperiment.id,
        metric_name: "views",
        metric_value: 55,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "m2",
        experiment_id: baseExperiment.id,
        metric_name: "signups",
        metric_value: 4, // Below 10, but > 3
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const result = analyzeExperiment(baseExperiment, metrics);
    expect(result.result).toBe("PROMISING");
    expect(result.success_criteria_met).toBe(false);
  });

  it("declares ITERATE when activity was detected but conversion was poor", () => {
    const metrics: ExperimentMetric[] = [
      {
        id: "m1",
        experiment_id: baseExperiment.id,
        metric_name: "views",
        metric_value: 15,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "m2",
        experiment_id: baseExperiment.id,
        metric_name: "signups",
        metric_value: 0,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const result = analyzeExperiment(baseExperiment, metrics);
    expect(result.result).toBe("ITERATE");
  });

  it("declares INSUFFICIENT_DATA when zero metrics have been recorded", () => {
    const result = analyzeExperiment(baseExperiment, []);
    expect(result.result).toBe("INSUFFICIENT_DATA");
  });

  it("declares STOPPED if a mandatory stop condition was triggered", () => {
    const stoppedExp = {
      ...baseExperiment,
      failure_criteria: [{ condition: "Platform restriction", triggered: true }],
    };

    const metrics: ExperimentMetric[] = [
      {
        id: "m1",
        experiment_id: baseExperiment.id,
        metric_name: "signups",
        metric_value: 12,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const result = analyzeExperiment(stoppedExp, metrics);
    expect(result.result).toBe("STOPPED");
    expect(result.stop_condition_triggered).toBe(true);
  });
});
