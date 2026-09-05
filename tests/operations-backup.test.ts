import { describe, it, expect, vi, beforeEach } from "vitest";
import { operationsBackupEngine } from "@/operations/backup-engine";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { operationsEventBus } from "@/operations/event-bus";
import * as dbClient from "@/database/client";
import type { SystemState } from "@/types/operations";

describe("Phase 11 — Zero-Cost Backup, Secret Scrubbing & Restore Validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(operationsEventBus, "publish").mockResolvedValue({} as any);
  });

  it("creates a zero-cost backup export with SHA-256 checksum and secret scrubbing", async () => {
    vi.spyOn(operationsRepo, "getSystemState").mockResolvedValue({
      id: "global",
      is_paused: false,
      is_kill_switch_active: false,
      readiness_status: "SYSTEM_READY",
    } as SystemState);
    vi.spyOn(operationsRepo, "listAgents").mockResolvedValue([]);
    vi.spyOn(operationsRepo, "listIntegrationHealth").mockResolvedValue([]);

    // Mock DB tables containing a secret key that must be scrubbed
    vi.spyOn(dbClient, "queryMany").mockImplementation(async (sql: string) => {
      if (sql.includes("opportunities")) {
        return [
          {
            id: "opp-1",
            title: "Dev Tools Opportunity",
            api_key: "sk-super-secret-key-that-must-be-redacted",
            nested: { auth_token: "bearer-token-123" },
          },
        ];
      }
      return [];
    });

    vi.spyOn(operationsRepo, "createBackupRecord").mockImplementation(async (record) => {
      return {
        id: "backup-rec-1",
        created_at: new Date().toISOString(),
        ...record,
      } as any;
    });

    const result = await operationsBackupEngine.createBackupSnapshot("FULL");

    expect(result.backup.id).toBe("backup-rec-1");
    expect(result.backup.status).toBe("COMPLETED");
    expect(result.backup.includes_secrets).toBe(false);
    expect(result.data.checksum_sha256).toBeDefined();
    expect(result.data.checksum_sha256).toHaveLength(64); // 64 hex chars for sha256

    // Verify secret scrubbing
    const opp = result.data.tables.opportunities?.[0];
    expect(opp.title).toBe("Dev Tools Opportunity");
    expect(opp.api_key).toBe("[REDACTED_SECRET]");
    expect(opp.nested.auth_token).toBe("[REDACTED_SECRET]");
  });

  it("validates backup schema integrity and rejects invalid payloads", () => {
    // 1. Completely invalid
    const invalidResult1 = operationsBackupEngine.validateRestorePayload(null);
    expect(invalidResult1.isValid).toBe(false);

    // 2. Missing checksum and system state
    const invalidResult2 = operationsBackupEngine.validateRestorePayload({
      version: "1.0.0",
      tables: {},
    });
    expect(invalidResult2.isValid).toBe(false);
    expect(invalidResult2.errors).toContain("Missing SHA-256 integrity checksum.");
    expect(invalidResult2.errors).toContain("Missing required system_state block.");

    // 3. Valid payload
    const validResult = operationsBackupEngine.validateRestorePayload({
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      system_state: { id: "global" },
      tables: { opportunities: [] },
    });
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);
  });
});
