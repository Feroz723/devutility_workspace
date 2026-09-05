import { describe, it, expect, vi, beforeEach } from "vitest";
import { bottleneckDetector } from "@/strategy/bottleneck-detector";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import { funnelAnalysisEngine } from "@/strategy/funnel-analysis-engine";
import * as intelligenceRepo from "@/database/repositories/intelligence-repo";
import * as salesRepo from "@/database/repositories/sales-repo";
import * as dbClient from "@/database/client";

import * as auditRepo from "@/database/repositories/audit-repo";

describe("Phase 13 — Structural Bottleneck Detector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditRepo, "createAuditLog").mockResolvedValue({} as any);
  });

  it("detects awareness bottleneck when visitor exposure is critically low", async () => {
    vi.spyOn(funnelAnalysisEngine, "analyzeFunnel").mockResolvedValue([
      { stage_name: "REACH", raw_count: 15, sample_size_status: "SUFFICIENT" } as any,
      { stage_name: "VISIT", raw_count: 5, sample_size_status: "INSUFFICIENT_DATA" } as any,
      { stage_name: "SIGNUP", raw_count: 0, sample_size_status: "INSUFFICIENT_DATA" } as any,
    ]);

    vi.spyOn(intelligenceRepo, "getLatestBusinessSnapshot").mockResolvedValue({ total_visitors_count: 5 } as any);
    vi.spyOn(salesRepo, "listOrders").mockResolvedValue([]);
    vi.spyOn(salesRepo, "listRefunds").mockResolvedValue([]);
    vi.spyOn(dbClient, "queryMany").mockResolvedValue([]);

    vi.spyOn(strategyRepo, "createBottleneck").mockImplementation(async (b: any) => ({
      ...b,
      id: "bot-test",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const bottlenecks = await bottleneckDetector.detectBottlenecks("prod-test", false);
    expect(bottlenecks.length).toBeGreaterThan(0);

    const primary = bottlenecks.find((b) => b.is_primary);
    expect(primary).toBeDefined();
    expect(primary?.bottleneck_type).toBe("awareness");
    expect(primary?.severity).toBe("HIGH");
  });

  it("detects checkout bottleneck when signups exist but payment conversions are zero", async () => {
    vi.spyOn(funnelAnalysisEngine, "analyzeFunnel").mockResolvedValue([
      { stage_name: "REACH", raw_count: 100, sample_size_status: "SUFFICIENT" } as any,
      { stage_name: "VISIT", raw_count: 60, sample_size_status: "SUFFICIENT" } as any,
      { stage_name: "SIGNUP", raw_count: 15, sample_size_status: "SUFFICIENT" } as any,
      { stage_name: "PAYMENT", raw_count: 0, sample_size_status: "INSUFFICIENT_DATA" } as any,
    ]);

    vi.spyOn(intelligenceRepo, "getLatestBusinessSnapshot").mockResolvedValue({ total_visitors_count: 60 } as any);
    vi.spyOn(salesRepo, "listOrders").mockResolvedValue([]);
    vi.spyOn(salesRepo, "listRefunds").mockResolvedValue([]);
    vi.spyOn(dbClient, "queryMany").mockResolvedValue([]);

    vi.spyOn(strategyRepo, "createBottleneck").mockImplementation(async (b: any) => ({
      ...b,
      id: "bot-checkout",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const bottlenecks = await bottleneckDetector.detectBottlenecks("prod-test", false);
    const checkoutBot = bottlenecks.find((b) => b.bottleneck_type === "checkout");
    expect(checkoutBot).toBeDefined();
    expect(checkoutBot?.severity).toBe("CRITICAL");
    expect(checkoutBot?.is_primary).toBe(true);
  });
});
