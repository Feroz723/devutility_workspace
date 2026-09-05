import { query, queryOne, queryMany } from "@/database/client";
import type {
  SimulationTestRun,
  SimulationScenarioResult,
  SimulationAuditLog,
  RealityScorecard,
  TriggerMode,
  DataRealm,
  TestRunStatus,
  ScenarioStatus,
  ScenarioId,
  ScenarioCategory,
} from "@/types/reality-test";

export class RealityTestRepository {
  // ==============================================================================
  // 1. SIMULATION TEST RUNS
  // ==============================================================================

  async createTestRun(input: {
    trigger_mode?: TriggerMode;
    realm?: DataRealm;
    total_scenarios?: number;
    triggered_by?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SimulationTestRun> {
    const row = await queryOne<any>(
      `INSERT INTO simulation_test_runs (
        trigger_mode, realm, status, total_scenarios, passed_scenarios,
        failed_scenarios, skipped_scenarios, started_at, triggered_by, notes, metadata
      ) VALUES ($1, $2, 'RUNNING', $3, 0, 0, 0, NOW(), $4, $5, $6)
      RETURNING *`,
      [
        input.trigger_mode || "MANUAL",
        input.realm || "SIMULATION",
        input.total_scenarios || 0,
        input.triggered_by || "OPERATOR",
        input.notes || null,
        JSON.stringify(input.metadata || {}),
      ]
    );
    return this.mapTestRun(row);
  }

  async updateTestRun(
    id: string,
    updates: {
      status?: TestRunStatus;
      total_scenarios?: number;
      passed_scenarios?: number;
      failed_scenarios?: number;
      skipped_scenarios?: number;
      completed_at?: string | null;
      duration_ms?: number;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<SimulationTestRun | null> {
    const row = await queryOne<any>(
      `UPDATE simulation_test_runs SET
        status = COALESCE($2, status),
        total_scenarios = COALESCE($3, total_scenarios),
        passed_scenarios = COALESCE($4, passed_scenarios),
        failed_scenarios = COALESCE($5, failed_scenarios),
        skipped_scenarios = COALESCE($6, skipped_scenarios),
        completed_at = CASE WHEN $7::timestamptz IS NOT NULL THEN $7::timestamptz ELSE completed_at END,
        duration_ms = COALESCE($8, duration_ms),
        notes = COALESCE($9, notes),
        metadata = COALESCE($10, metadata)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        updates.status || null,
        updates.total_scenarios !== undefined ? updates.total_scenarios : null,
        updates.passed_scenarios !== undefined ? updates.passed_scenarios : null,
        updates.failed_scenarios !== undefined ? updates.failed_scenarios : null,
        updates.skipped_scenarios !== undefined ? updates.skipped_scenarios : null,
        updates.completed_at || null,
        updates.duration_ms !== undefined ? updates.duration_ms : null,
        updates.notes || null,
        updates.metadata ? JSON.stringify(updates.metadata) : null,
      ]
    );
    return row ? this.mapTestRun(row) : null;
  }

  async getTestRunById(id: string): Promise<SimulationTestRun | null> {
    const row = await queryOne<any>(
      `SELECT * FROM simulation_test_runs WHERE id = $1`,
      [id]
    );
    return row ? this.mapTestRun(row) : null;
  }

  async getLatestTestRun(): Promise<SimulationTestRun | null> {
    const row = await queryOne<any>(
      `SELECT * FROM simulation_test_runs ORDER BY created_at DESC LIMIT 1`
    );
    return row ? this.mapTestRun(row) : null;
  }

  async listTestRuns(limit: number = 20): Promise<SimulationTestRun[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM simulation_test_runs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((r) => this.mapTestRun(r));
  }

  // ==============================================================================
  // 2. SIMULATION SCENARIO RESULTS
  // ==============================================================================

  async recordScenarioResult(input: {
    run_id: string;
    scenario_id: ScenarioId;
    scenario_name: string;
    category: ScenarioCategory;
    realm?: DataRealm;
    status: ScenarioStatus;
    duration_ms?: number;
    error_message?: string | null;
    primary_bottleneck?: string | null;
    strategy_decision?: string | null;
    what_waiting_for?: string | null;
    human_approval_required?: boolean;
    safety_invariants_verified?: any[];
    state_transitions?: any[];
    evidence_flow?: any[];
    execution_trace?: any[];
    raw_output?: Record<string, unknown>;
  }): Promise<SimulationScenarioResult> {
    const row = await queryOne<any>(
      `INSERT INTO simulation_scenario_results (
        run_id, scenario_id, scenario_name, category, realm, status,
        duration_ms, error_message, primary_bottleneck, strategy_decision,
        what_waiting_for, human_approval_required, safety_invariants_verified,
        state_transitions, evidence_flow, execution_trace, raw_output
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        input.run_id,
        input.scenario_id,
        input.scenario_name,
        input.category,
        input.realm || "SIMULATION",
        input.status,
        input.duration_ms || 0,
        input.error_message || null,
        input.primary_bottleneck || null,
        input.strategy_decision || null,
        input.what_waiting_for || null,
        input.human_approval_required ?? false,
        JSON.stringify(input.safety_invariants_verified || []),
        JSON.stringify(input.state_transitions || []),
        JSON.stringify(input.evidence_flow || []),
        JSON.stringify(input.execution_trace || []),
        JSON.stringify(input.raw_output || {}),
      ]
    );
    return this.mapScenarioResult(row);
  }

  async listScenarioResults(runId: string): Promise<SimulationScenarioResult[]> {
    const rows = await queryMany<any>(
      `SELECT * FROM simulation_scenario_results WHERE run_id = $1 ORDER BY created_at ASC`,
      [runId]
    );
    return rows.map((r) => this.mapScenarioResult(r));
  }

  async getScenarioResult(
    runId: string,
    scenarioId: string
  ): Promise<SimulationScenarioResult | null> {
    const row = await queryOne<any>(
      `SELECT * FROM simulation_scenario_results WHERE run_id = $1 AND scenario_id = $2 LIMIT 1`,
      [runId, scenarioId]
    );
    return row ? this.mapScenarioResult(row) : null;
  }

  // ==============================================================================
  // 3. SIMULATION AUDIT LOGS
  // ==============================================================================

  async recordSimulationAuditLog(input: {
    run_id: string;
    scenario_id: string;
    phase: string;
    step_name: string;
    action: string;
    decision?: string;
    evidence_summary?: string;
    state_transition?: string;
    safety_decision?: string;
    approval_requirement?: string;
    execution_result?: "SUCCESS" | "FAILED" | "BLOCKED" | "SKIPPED";
    input_payload?: Record<string, unknown>;
    output_payload?: Record<string, unknown>;
    error_detail?: string;
  }): Promise<SimulationAuditLog> {
    const row = await queryOne<any>(
      `INSERT INTO simulation_audit_logs (
        run_id, scenario_id, phase, step_name, action, decision,
        evidence_summary, state_transition, safety_decision, approval_requirement,
        execution_result, input_payload, output_payload, error_detail
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        input.run_id,
        input.scenario_id,
        input.phase,
        input.step_name,
        input.action,
        input.decision || null,
        input.evidence_summary || null,
        input.state_transition || null,
        input.safety_decision || null,
        input.approval_requirement || null,
        input.execution_result || "SUCCESS",
        JSON.stringify(input.input_payload || {}),
        JSON.stringify(input.output_payload || {}),
        input.error_detail || null,
      ]
    );
    return this.mapAuditLog(row);
  }

  async listSimulationAuditLogs(
    runId: string,
    scenarioId?: string
  ): Promise<SimulationAuditLog[]> {
    if (scenarioId) {
      const rows = await queryMany<any>(
        `SELECT * FROM simulation_audit_logs
         WHERE run_id = $1 AND scenario_id = $2
         ORDER BY timestamp ASC`,
        [runId, scenarioId]
      );
      return rows.map((r) => this.mapAuditLog(r));
    }
    const rows = await queryMany<any>(
      `SELECT * FROM simulation_audit_logs
       WHERE run_id = $1
       ORDER BY timestamp ASC`,
      [runId]
    );
    return rows.map((r) => this.mapAuditLog(r));
  }

  // ==============================================================================
  // 4. REALITY SCORECARDS
  // ==============================================================================

  async upsertRealityScorecard(input: {
    run_id: string;
    realm?: DataRealm;
    architecture_integrity_score: number;
    data_integrity_score: number;
    evidence_integrity_score: number;
    lifecycle_integrity_score: number;
    strategy_integrity_score: number;
    autonomy_integrity_score: number;
    zero_spend_compliance_score: number;
    security_score: number;
    failure_recovery_score: number;
    integration_readiness_score: number;
    auditability_score: number;
    production_readiness_score: number;
    overall_verification_score: number;
    category_evaluations?: any;
    production_readiness_report?: any;
  }): Promise<RealityScorecard> {
    const row = await queryOne<any>(
      `INSERT INTO reality_scorecards (
        run_id, realm, architecture_integrity_score, data_integrity_score,
        evidence_integrity_score, lifecycle_integrity_score, strategy_integrity_score,
        autonomy_integrity_score, zero_spend_compliance_score, security_score,
        failure_recovery_score, integration_readiness_score, auditability_score,
        production_readiness_score, overall_verification_score,
        category_evaluations, production_readiness_report
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        input.run_id,
        input.realm || "SIMULATION",
        input.architecture_integrity_score,
        input.data_integrity_score,
        input.evidence_integrity_score,
        input.lifecycle_integrity_score,
        input.strategy_integrity_score,
        input.autonomy_integrity_score,
        input.zero_spend_compliance_score,
        input.security_score,
        input.failure_recovery_score,
        input.integration_readiness_score,
        input.auditability_score,
        input.production_readiness_score,
        input.overall_verification_score,
        JSON.stringify(input.category_evaluations || {}),
        JSON.stringify(input.production_readiness_report || {}),
      ]
    );
    return this.mapScorecard(row);
  }

  async getLatestRealityScorecard(): Promise<RealityScorecard | null> {
    const row = await queryOne<any>(
      `SELECT * FROM reality_scorecards ORDER BY created_at DESC LIMIT 1`
    );
    return row ? this.mapScorecard(row) : null;
  }

  async getRealityScorecardByRunId(runId: string): Promise<RealityScorecard | null> {
    const row = await queryOne<any>(
      `SELECT * FROM reality_scorecards WHERE run_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [runId]
    );
    return row ? this.mapScorecard(row) : null;
  }

  // ==============================================================================
  // 5. SECURE SIMULATION DATA RESET
  // ==============================================================================

  /**
   * Resets simulation data exclusively from simulation tables.
   * NEVER modifies production tables (products, orders, customers, business_snapshots, etc.).
   */
  async resetSimulationData(): Promise<{
    runsDeleted: number;
    scenariosDeleted: number;
    auditLogsDeleted: number;
    scorecardsDeleted: number;
  }> {
    const scorecardsRes = await query<any>(`DELETE FROM reality_scorecards WHERE realm = 'SIMULATION'`);
    const auditRes = await query<any>(`DELETE FROM simulation_audit_logs`);
    const scenarioRes = await query<any>(`DELETE FROM simulation_scenario_results WHERE realm = 'SIMULATION'`);
    const runsRes = await query<any>(`DELETE FROM simulation_test_runs WHERE realm = 'SIMULATION'`);

    return {
      runsDeleted: runsRes.rowCount ?? 0,
      scenariosDeleted: scenarioRes.rowCount ?? 0,
      auditLogsDeleted: auditRes.rowCount ?? 0,
      scorecardsDeleted: scorecardsRes.rowCount ?? 0,
    };
  }

  // ==============================================================================
  // MAPPERS
  // ==============================================================================

  private mapTestRun(row: any): SimulationTestRun {
    return {
      id: row.id,
      trigger_mode: row.trigger_mode,
      realm: row.realm,
      status: row.status,
      total_scenarios: Number(row.total_scenarios || 0),
      passed_scenarios: Number(row.passed_scenarios || 0),
      failed_scenarios: Number(row.failed_scenarios || 0),
      skipped_scenarios: Number(row.skipped_scenarios || 0),
      started_at: new Date(row.started_at).toISOString(),
      completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      duration_ms: Number(row.duration_ms || 0),
      triggered_by: row.triggered_by || "OPERATOR",
      notes: row.notes || null,
      metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {}),
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private mapScenarioResult(row: any): SimulationScenarioResult {
    return {
      id: row.id,
      run_id: row.run_id,
      scenario_id: row.scenario_id,
      scenario_name: row.scenario_name,
      category: row.category,
      realm: row.realm,
      status: row.status,
      duration_ms: Number(row.duration_ms || 0),
      error_message: row.error_message || null,
      primary_bottleneck: row.primary_bottleneck || null,
      strategy_decision: row.strategy_decision || null,
      what_waiting_for: row.what_waiting_for || null,
      human_approval_required: Boolean(row.human_approval_required),
      safety_invariants_verified: typeof row.safety_invariants_verified === "string"
        ? JSON.parse(row.safety_invariants_verified)
        : (row.safety_invariants_verified || []),
      state_transitions: typeof row.state_transitions === "string"
        ? JSON.parse(row.state_transitions)
        : (row.state_transitions || []),
      evidence_flow: typeof row.evidence_flow === "string"
        ? JSON.parse(row.evidence_flow)
        : (row.evidence_flow || []),
      execution_trace: typeof row.execution_trace === "string"
        ? JSON.parse(row.execution_trace)
        : (row.execution_trace || []),
      raw_output: typeof row.raw_output === "string"
        ? JSON.parse(row.raw_output)
        : (row.raw_output || {}),
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private mapAuditLog(row: any): SimulationAuditLog {
    return {
      id: row.id,
      run_id: row.run_id,
      scenario_id: row.scenario_id,
      phase: row.phase,
      step_name: row.step_name,
      action: row.action,
      decision: row.decision || null,
      evidence_summary: row.evidence_summary || null,
      state_transition: row.state_transition || null,
      safety_decision: row.safety_decision || null,
      approval_requirement: row.approval_requirement || null,
      execution_result: row.execution_result || "SUCCESS",
      input_payload: typeof row.input_payload === "string" ? JSON.parse(row.input_payload) : (row.input_payload || {}),
      output_payload: typeof row.output_payload === "string" ? JSON.parse(row.output_payload) : (row.output_payload || {}),
      error_detail: row.error_detail || null,
      timestamp: new Date(row.timestamp).toISOString(),
    };
  }

  private mapScorecard(row: any): RealityScorecard {
    return {
      id: row.id,
      run_id: row.run_id,
      realm: row.realm,
      architecture_integrity_score: Number(row.architecture_integrity_score),
      data_integrity_score: Number(row.data_integrity_score),
      evidence_integrity_score: Number(row.evidence_integrity_score),
      lifecycle_integrity_score: Number(row.lifecycle_integrity_score),
      strategy_integrity_score: Number(row.strategy_integrity_score),
      autonomy_integrity_score: Number(row.autonomy_integrity_score),
      zero_spend_compliance_score: Number(row.zero_spend_compliance_score),
      security_score: Number(row.security_score),
      failure_recovery_score: Number(row.failure_recovery_score),
      integration_readiness_score: Number(row.integration_readiness_score),
      auditability_score: Number(row.auditability_score),
      production_readiness_score: Number(row.production_readiness_score),
      overall_verification_score: Number(row.overall_verification_score),
      category_evaluations: typeof row.category_evaluations === "string"
        ? JSON.parse(row.category_evaluations)
        : (row.category_evaluations || {}),
      production_readiness_report: typeof row.production_readiness_report === "string"
        ? JSON.parse(row.production_readiness_report)
        : (row.production_readiness_report || {}),
      created_at: new Date(row.created_at).toISOString(),
    };
  }
}

export const realityTestRepo = new RealityTestRepository();
