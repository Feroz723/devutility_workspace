import { describe, it, expect, vi, beforeEach } from "vitest";
import { patternRecognitionEngine } from "@/strategy/pattern-recognition-engine";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import * as distributionRepo from "@/database/repositories/distribution-repo";
import * as salesRepo from "@/database/repositories/sales-repo";

import * as auditRepo from "@/database/repositories/audit-repo";

describe("Phase 13 — Empirical Patterns & Causality Discipline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);
  });

  it("enforces strict non-causal labeling for correlation observations", async () => {
    vi.spyOn(distributionRepo, "listChannels").mockResolvedValue([
      { id: "ch-1", name: "Twitter/X Organic", status: "ACTIVE" } as any,
      { id: "ch-2", name: "Reddit Value Posts", status: "ACTIVE" } as any,
    ]);

    vi.spyOn(salesRepo, "listOrders").mockResolvedValue([]);
    vi.spyOn(salesRepo, "listCheckoutSessions").mockResolvedValue([
      { id: "cs-1" } as any,
      { id: "cs-2" } as any,
    ]);

    vi.spyOn(strategyRepo, "createPattern").mockImplementation(async (p: any) => ({
      ...p,
      id: "pat-1",
      created_at: new Date().toISOString(),
    }));

    const patterns = await patternRecognitionEngine.discoverPatterns(false);
    expect(patterns.length).toBeGreaterThan(0);

    // Assert that causality type is NEVER directly CAUSAL or DEFINITIVE
    for (const p of patterns) {
      expect(["CORRELATED", "ASSOCIATED", "TEMPORALLY_FOLLOWING", "POSSIBLE_DRIVER", "HYPOTHESIS"]).toContain(
        p.causality_type
      );
      expect(p.limitations).toBeDefined();
    }
  });

  it("labels checkout abandonment as HYPOTHESIS when sample size is below 10", async () => {
    vi.spyOn(distributionRepo, "listChannels").mockResolvedValue([]);
    vi.spyOn(salesRepo, "listOrders").mockResolvedValue([]);
    vi.spyOn(salesRepo, "listCheckoutSessions").mockResolvedValue([
      { id: "cs-1" } as any,
      { id: "cs-2" } as any,
      { id: "cs-3" } as any,
    ]);

    vi.spyOn(strategyRepo, "createPattern").mockImplementation(async (p: any) => ({
      ...p,
      id: "pat-checkout",
      created_at: new Date().toISOString(),
    }));

    const patterns = await patternRecognitionEngine.discoverPatterns(false);
    const checkoutPat = patterns.find((p) => p.pattern_name.includes("Checkout"));
    expect(checkoutPat).toBeDefined();
    expect(checkoutPat?.causality_type).toBe("HYPOTHESIS");
    expect(checkoutPat?.confidence).toBe("INSUFFICIENT_DATA");
  });
});
