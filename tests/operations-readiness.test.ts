import { describe, it, expect, vi, beforeEach } from "vitest";
import { systemReadinessEngine } from "@/operations/readiness-engine";
import { integrationRegistry } from "@/operations/integration-registry";
import { operationsRepo } from "@/database/repositories/operations-repo";
import type { SystemState } from "@/types/operations";

describe("Phase 11 — System Readiness & Integration Health Monitor", () => {
  const defaultState: SystemState = {
    id: "global",
    readiness_status: "SYSTEM_READY",
    readiness_reasons: [],
    is_paused: false,
    pause_reason: null,
    is_kill_switch_active: false,
    kill_switch_triggered_at: null,
    kill_switch_reason: null,
    active_cycle: "IDLE",
    last_daily_cycle_at: null,
    last_weekly_cycle_at: null,
    spending_limit_inr: 0,
    metadata: {},
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(operationsRepo, "updateSystemState").mockResolvedValue({} as any);
  });

  it("evaluates SYSTEM_BLOCKED when emergency kill switch is engaged", async () => {
    vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
      ...defaultState,
      is_kill_switch_active: true,
      kill_switch_reason: "Manual safety trip",
    });
    vi.spyOn(integrationRegistry, "checkAllIntegrations").mockResolvedValue([]);
    vi.spyOn(operationsRepo, "listDeadLetterJobs").mockResolvedValue({ jobs: [], total: 0 });
    vi.spyOn(operationsRepo, "listUnifiedApprovals").mockResolvedValue([]);

    const result = await systemReadinessEngine.evaluateReadiness();

    expect(result.status).toBe("SYSTEM_BLOCKED");
    expect(result.killSwitchActive).toBe(true);
    expect(result.reasons[0]).toContain("Emergency Kill Switch is engaged");
  });

  it("evaluates SYSTEM_BLOCKED when global pause is active", async () => {
    vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
      ...defaultState,
      is_paused: true,
      pause_reason: "Scheduled maintenance",
    });
    vi.spyOn(integrationRegistry, "checkAllIntegrations").mockResolvedValue([]);
    vi.spyOn(operationsRepo, "listDeadLetterJobs").mockResolvedValue({ jobs: [], total: 0 });
    vi.spyOn(operationsRepo, "listUnifiedApprovals").mockResolvedValue([]);

    const result = await systemReadinessEngine.evaluateReadiness();

    expect(result.status).toBe("SYSTEM_BLOCKED");
    expect(result.isPaused).toBe(true);
    expect(result.reasons[0]).toContain("Global Pause is active");
  });

  it("evaluates SYSTEM_NOT_READY when primary PostgreSQL database check fails", async () => {
    vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue(defaultState);
    vi.spyOn(integrationRegistry, "checkAllIntegrations").mockResolvedValue([
      {
        provider: "POSTGRES",
        category: "DATABASE",
        connection_status: "UNHEALTHY",
        is_essential: true,
      } as any,
    ]);
    vi.spyOn(operationsRepo, "listDeadLetterJobs").mockResolvedValue({ jobs: [], total: 0 });
    vi.spyOn(operationsRepo, "listUnifiedApprovals").mockResolvedValue([]);

    const result = await systemReadinessEngine.evaluateReadiness();

    expect(result.status).toBe("SYSTEM_NOT_READY");
    expect(result.databaseHealthy).toBe(false);
    expect(result.reasons[0]).toContain("PostgreSQL database connection is unreachable");
  });

  it("evaluates SYSTEM_PARTIALLY_READY when DB is healthy but external APIs require manual setup", async () => {
    vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue(defaultState);
    vi.spyOn(integrationRegistry, "checkAllIntegrations").mockResolvedValue([
      {
        provider: "POSTGRES",
        category: "DATABASE",
        connection_status: "HEALTHY",
        is_essential: true,
      } as any,
      {
        provider: "RAZORPAY",
        category: "PAYMENT",
        connection_status: "NOT_CONNECTED",
        is_essential: false,
      } as any,
      {
        provider: "OPENAI",
        category: "AI",
        connection_status: "REQUIRES_MANUAL_SETUP",
        is_essential: false,
      } as any,
    ]);
    vi.spyOn(operationsRepo, "listDeadLetterJobs").mockResolvedValue({ jobs: [], total: 0 });
    vi.spyOn(operationsRepo, "listUnifiedApprovals").mockResolvedValue([]);

    const result = await systemReadinessEngine.evaluateReadiness();

    expect(result.status).toBe("SYSTEM_PARTIALLY_READY");
    expect(result.databaseHealthy).toBe(true);
    expect(result.unconnectedIntegrationsCount).toBe(2);
    expect(result.reasons.some((r: string) => r.includes("AI API provider"))).toBe(true);
    expect(result.reasons.some((r: string) => r.includes("payment gateways"))).toBe(true);
  });

  it("never fabricates live credentials during integration health checks", async () => {
    // Check Razorpay probe without env vars
    const oldKey = process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_ID;

    const paymentIntegrations = await integrationRegistry.checkPaymentProviders();
    const probe = paymentIntegrations.find((p) => p.provider === "RAZORPAY")!;

    expect(["NOT_CONNECTED", "REQUIRES_MANUAL_SETUP"]).toContain(probe.connection_status);

    if (oldKey) process.env.RAZORPAY_KEY_ID = oldKey;
  });
});
