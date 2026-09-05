import { describe, it, expect } from "vitest";
import {
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  runScenarioE,
} from "@/simulation/scenarios/scenarios-a-to-e";

describe("Phase 14 Reality Tests: Scenarios A through E", () => {
  const dummyRunId = "00000000-0000-0000-0000-000000000099";

  it("SCENARIO A: New opportunity discovery queues in backlog and preserves active product focus", async () => {
    const result = await runScenarioA(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_A");
    expect(result.status).toBe("PASSED");
    expect(result.strategyDecision).toBe("BACKLOG_QUEUED_PRESERVE_ACTIVE_FOCUS");
    expect(result.safetyInvariantsVerified.length).toBeGreaterThanOrEqual(2);
    expect(result.safetyInvariantsVerified.every((inv) => inv.verified)).toBe(true);
  });

  it("SCENARIO B: Primary product progresses through 8 lifecycle stages with single focus maintained", async () => {
    const result = await runScenarioB(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_B");
    expect(result.status).toBe("PASSED");
    expect(result.stateTransitions.length).toBe(8);
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_8_PRIMARY_PRODUCT_FOCUS")?.verified).toBe(true);
  });

  it("SCENARIO C: Low traffic (<100 visits) reports INSUFFICIENT_DATA and does not fail product", async () => {
    const result = await runScenarioC(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_C");
    expect(result.status).toBe("PASSED");
    expect(result.primaryBottleneck).toBe("LOW_TRAFFIC");
    expect(result.strategyDecision).toBe("CONTINUE_DISTRIBUTION_AND_OBSERVATION");
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_6_MULTI_SIGNAL_STOP")?.verified).toBe(true);
  });

  it("SCENARIO D: High traffic (1,500 visits) with low signups shifts strategy to landing page/copy", async () => {
    const result = await runScenarioD(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_D");
    expect(result.status).toBe("PASSED");
    expect(result.primaryBottleneck).toBe("LOW_VISITOR_TO_LEAD_CONVERSION");
    expect(result.strategyDecision).toBe("OPTIMIZE_LANDING_PAGE_AND_MESSAGING");
  });

  it("SCENARIO E: Good signup volume (120 signups) with low activation prioritizes time-to-value", async () => {
    const result = await runScenarioE(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_E");
    expect(result.status).toBe("PASSED");
    expect(result.primaryBottleneck).toBe("POOR_ONBOARDING_ACTIVATION");
    expect(result.strategyDecision).toBe("IMPROVE_TIME_TO_VALUE_AND_ONBOARDING");
  });
});
