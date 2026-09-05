import { describe, it, expect } from "vitest";
import {
  runScenarioP,
  runScenarioQ,
  runScenarioR,
} from "@/simulation/scenarios/scenarios-p-to-r";

describe("Phase 14 Reality Tests: Scenarios P through R", () => {
  const dummyRunId = "00000000-0000-0000-0000-000000000096";

  it("SCENARIO P: Sample size < 10 classifies metric as INSUFFICIENT_DATA and prevents false pivots", async () => {
    const result = await runScenarioP(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_P");
    expect(result.status).toBe("PASSED");
    expect(result.primaryBottleneck).toBe("INSUFFICIENT_DATA");
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_7_INSUFFICIENT_DATA_SAFE")?.verified).toBe(true);
  });

  it("SCENARIO Q: Emergency kill switch halts all execution and overrides autonomous dispatches", async () => {
    const result = await runScenarioQ(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_Q");
    expect(result.status).toBe("PASSED");
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_11_KILL_SWITCH_OVERRIDE")?.verified).toBe(true);
  }, 15000);

  it("SCENARIO R: Zero-spend violations across paid ad, email, hosting, and API vectors are 100% blocked", async () => {
    const result = await runScenarioR(dummyRunId);

    expect(result.scenarioId).toBe("SCENARIO_R");
    expect(result.status).toBe("PASSED");
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_1_ZERO_SPEND")?.verified).toBe(true);
    expect(result.rawOutput.zeroSilentSpend).toBe(true);
  });
});
