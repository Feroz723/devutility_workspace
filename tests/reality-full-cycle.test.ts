import { describe, it, expect } from "vitest";
import { runFullCycleScenario } from "@/simulation/scenarios/scenario-full-cycle";

describe("Phase 14 Reality Tests: Full Autonomous Business Simulation Cycle", () => {
  const dummyRunId = "00000000-0000-0000-0000-000000000095";

  it("Executes end-to-end simulated cycle through all 13 phases with valid input/output linkage", async () => {
    const result = await runFullCycleScenario(dummyRunId);

    expect(result.scenarioId).toBe("FULL_CYCLE");
    expect(result.status).toBe("PASSED");
    expect(result.executionTrace.length).toBe(10);
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_1_ZERO_SPEND")?.verified).toBe(true);
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_3_NO_REALM_POLLUTION")?.verified).toBe(true);
    expect(result.safetyInvariantsVerified.find((i) => i.id === "INVARIANT_8_PRIMARY_PRODUCT_FOCUS")?.verified).toBe(true);
  });
});
