import { queryOne } from "@/database/client";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { systemReadinessEngine } from "./readiness-engine";
import type { DiagnosticCheckItem } from "@/types/operations";

export class OperationsDiagnosticsEngine {
  /**
   * Run comprehensive machine-readable system diagnostic suite
   */
  async runDiagnostics(): Promise<DiagnosticCheckItem[]> {
    const results: DiagnosticCheckItem[] = [];

    // 1. Database Check
    const dbStart = Date.now();
    try {
      const dbPing = await queryOne<{ ping: number }>("SELECT 1 as ping");
      results.push({
        id: "diag-db",
        name: "PostgreSQL Database Connectivity",
        category: "DATABASE",
        status: dbPing?.ping === 1 ? "PASS" : "FAIL",
        message: "Database responds successfully to ping queries.",
        duration_ms: Date.now() - dbStart,
      });
    } catch (err: any) {
      results.push({
        id: "diag-db",
        name: "PostgreSQL Database Connectivity",
        category: "DATABASE",
        status: "FAIL",
        message: `Database connection failed: ${err.message}`,
        duration_ms: Date.now() - dbStart,
      });
    }

    // 2. Critical Tables Presence
    const tableStart = Date.now();
    try {
      const tablesRes = await queryOne<{ count: string }>(
        `SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
      );
      const count = parseInt(tablesRes?.count ?? "0", 10);
      results.push({
        id: "diag-tables",
        name: "Database Schema Migrations",
        category: "MIGRATIONS",
        status: count >= 20 ? "PASS" : "WARN",
        message: `Found ${count} public relational tables in the database.`,
        duration_ms: Date.now() - tableStart,
      });
    } catch (err: any) {
      results.push({
        id: "diag-tables",
        name: "Database Schema Migrations",
        category: "MIGRATIONS",
        status: "FAIL",
        message: `Failed to inspect schema tables: ${err.message}`,
        duration_ms: Date.now() - tableStart,
      });
    }

    // 3. Safety Guard Spend Limit Check
    const state = await operationsRepo.getSystemState();
    results.push({
      id: "diag-safety",
      name: "Global ₹0 Spending Limit Policy",
      category: "SAFETY",
      status: state.spending_limit_inr === 0 ? "PASS" : "WARN",
      message: `Automatic spending limit is strictly ₹${state.spending_limit_inr} INR.`,
    });

    // 4. Job Queue & Dead-Letter Health
    const dlStart = Date.now();
    const deadLetters = await operationsRepo.listDeadLetterJobs({ limit: 10 });
    results.push({
      id: "diag-deadletter",
      name: "Dead-Letter Queue Backlog",
      category: "JOB_QUEUE",
      status: deadLetters.total === 0 ? "PASS" : deadLetters.total < 5 ? "WARN" : "FAIL",
      message: `${deadLetters.total} unrecoverable jobs in Dead-Letter status.`,
      duration_ms: Date.now() - dlStart,
    });

    // 5. System Readiness Engine Check
    const readyStart = Date.now();
    const readiness = await systemReadinessEngine.evaluateReadiness();
    results.push({
      id: "diag-readiness",
      name: "Autonomous System Readiness",
      category: "ORCHESTRATOR",
      status:
        readiness.status === "SYSTEM_READY"
          ? "PASS"
          : readiness.status === "SYSTEM_PARTIALLY_READY"
          ? "WARN"
          : "FAIL",
      message: `System status: ${readiness.status}. ${readiness.reasons[0] || ""}`,
      duration_ms: Date.now() - readyStart,
    });

    return results;
  }
}

export const operationsDiagnosticsEngine = new OperationsDiagnosticsEngine();
