import crypto from "crypto";
import { queryMany, queryOne } from "@/database/client";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { operationsEventBus } from "./event-bus";
import type { BackupExportData, SystemBackup } from "./types";

export class OperationsBackupEngine {
  /**
   * Generates a zero-cost local JSON export snapshot of the business system state
   */
  async createBackupSnapshot(
    backupType: "FULL" | "CONFIG_ONLY" | "AUDIT_ONLY" | "BUSINESS_DATA" = "FULL"
  ): Promise<{ backup: SystemBackup; data: BackupExportData }> {
    const systemState = await operationsRepo.getSystemState();
    const agents = await operationsRepo.listAgents();
    const integrations = await operationsRepo.listIntegrationHealth();

    const tables: Record<string, any[]> = {};

    if (backupType === "FULL" || backupType === "BUSINESS_DATA") {
      tables.opportunities = await queryMany("SELECT * FROM opportunities LIMIT 500").catch(() => []);
      tables.experiments = await queryMany("SELECT * FROM experiments LIMIT 500").catch(() => []);
      tables.products = await queryMany("SELECT * FROM products LIMIT 500").catch(() => []);
      tables.offers = await queryMany("SELECT * FROM offers LIMIT 500").catch(() => []);
      tables.orders = await queryMany("SELECT * FROM orders LIMIT 500").catch(() => []);
      tables.portfolio_decisions = await queryMany("SELECT * FROM portfolio_decisions LIMIT 500").catch(() => []);
    }

    if (backupType === "FULL" || backupType === "AUDIT_ONLY") {
      tables.operations_events = await queryMany("SELECT * FROM operations_events ORDER BY timestamp DESC LIMIT 500").catch(() => []);
      tables.operations_jobs = await queryMany("SELECT * FROM operations_jobs ORDER BY created_at DESC LIMIT 500").catch(() => []);
    }

    // Deep sanitize to guarantee no secrets exist in the exported structure
    const sanitizedTables = operationsEventBus.sanitizePayload(tables);

    const exportPayload: Omit<BackupExportData, "checksum_sha256"> = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      system_state: systemState,
      agents,
      integrations,
      tables: sanitizedTables,
    };

    const serialized = JSON.stringify(exportPayload, null, 2);
    const checksum = crypto.createHash("sha256").update(serialized).digest("hex");

    const fullExportData: BackupExportData = {
      ...exportPayload,
      checksum_sha256: checksum,
    };

    const backupRecord = await operationsRepo.createBackupRecord({
      backup_type: backupType,
      file_path: `export://snapshots/abos-backup-${Date.now()}.json`,
      file_size_bytes: Buffer.byteLength(serialized, "utf-8"),
      checksum_sha256: checksum,
      includes_secrets: false,
      status: "COMPLETED",
      metadata: {
        record_counts: Object.fromEntries(
          Object.entries(sanitizedTables).map(([k, v]) => [k, (v as any[]).length])
        ),
      },
    });

    await operationsEventBus.publish({
      event_type: "BACKUP_CREATED",
      source_module: "OPERATIONS",
      entity_type: "BACKUP",
      entity_id: backupRecord.id,
      payload: { backup_type: backupType, file_size_bytes: backupRecord.file_size_bytes },
    });

    return { backup: backupRecord, data: fullExportData };
  }

  /**
   * Validate a backup JSON data structure before allowing restore
   */
  validateRestorePayload(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      return { isValid: false, errors: ["Invalid backup payload: not a valid JSON object."] };
    }

    if (!data.version) {
      errors.push("Missing backup schema version.");
    }

    if (!data.checksum_sha256) {
      errors.push("Missing SHA-256 integrity checksum.");
    }

    if (!data.system_state) {
      errors.push("Missing required system_state block.");
    }

    if (!data.tables || typeof data.tables !== "object") {
      errors.push("Missing tables data block.");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const operationsBackupEngine = new OperationsBackupEngine();
