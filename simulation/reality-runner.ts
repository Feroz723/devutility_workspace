import { realityTestRepo } from "@/database/repositories/reality-test-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { SCENARIO_REGISTRY, getAllScenarioDefinitions } from "./scenarios/registry";
import { scorecardGenerator } from "./scorecard-generator";
import type {
  ScenarioId,
  TriggerMode,
  SimulationTestRun,
  SimulationScenarioResult,
  RealityScorecard,
} from "@/types/reality-test";

export interface RealityRunResult {
  run: SimulationTestRun;
  scenarioResults: SimulationScenarioResult[];
  scorecard: RealityScorecard | null;
}

export class RealityRunner {
  private isRunning: boolean = false;

  getRunningStatus(): boolean {
    return this.isRunning;
  }

  /**
   * Run the complete End-to-End Reality Test & Simulation Suite (18 Scenarios + Full Cycle).
   */
  async runAllScenarios(options?: {
    triggeredBy?: string;
    triggerMode?: TriggerMode;
  }): Promise<RealityRunResult> {
    if (this.isRunning) {
      throw new Error("A reality simulation test run is already currently in progress.");
    }

    this.isRunning = true;
    const startTime = Date.now();
    const scenarioDefs = getAllScenarioDefinitions();

    // 1. Initialize Master Test Run Record
    const run = await realityTestRepo.createTestRun({
      trigger_mode: options?.triggerMode || "MANUAL",
      realm: "SIMULATION",
      total_scenarios: scenarioDefs.length,
      triggered_by: options?.triggeredBy || "OPERATOR",
      notes: `Autonomous End-to-End Reality Test Suite (${scenarioDefs.length} scenarios)`,
    });

    const recordedScenarioResults: SimulationScenarioResult[] = [];
    let passedCount = 0;
    let failedCount = 0;

    try {
      // 2. Execute Each Scenario Sequentially
      for (const def of scenarioDefs) {
        let output;
        try {
          output = await def.run(run.id);
        } catch (err: any) {
          output = {
            scenarioId: def.id,
            scenarioName: def.name,
            category: def.category,
            status: "FAILED" as const,
            durationMs: 0,
            errorMessage: err?.message || "Scenario execution threw unexpected exception",
            primaryBottleneck: null,
            strategyDecision: null,
            whatWaitingFor: null,
            humanApprovalRequired: false,
            safetyInvariantsVerified: [],
            stateTransitions: [],
            evidenceFlow: [],
            executionTrace: [{ phase: "RUNNER", step: "Exception", status: "FAILED", detail: err?.message }],
            auditLogs: [],
            rawOutput: { error: err?.message },
          };
        }

        if (output.status === "PASSED") {
          passedCount++;
        } else {
          failedCount++;
        }

        // Record granular scenario result
        const savedScenario = await realityTestRepo.recordScenarioResult({
          run_id: run.id,
          scenario_id: output.scenarioId,
          scenario_name: output.scenarioName,
          category: output.category,
          realm: "SIMULATION",
          status: output.status,
          duration_ms: output.durationMs,
          error_message: output.errorMessage,
          primary_bottleneck: output.primaryBottleneck,
          strategy_decision: output.strategyDecision,
          what_waiting_for: output.whatWaitingFor,
          human_approval_required: output.humanApprovalRequired,
          safety_invariants_verified: output.safetyInvariantsVerified,
          state_transitions: output.stateTransitions,
          evidence_flow: output.evidenceFlow,
          execution_trace: output.executionTrace,
          raw_output: output.rawOutput,
        });

        recordedScenarioResults.push(savedScenario);

        // Record scenario audit logs
        for (const log of output.auditLogs) {
          await realityTestRepo.recordSimulationAuditLog({
            run_id: run.id,
            scenario_id: output.scenarioId,
            phase: log.phase,
            step_name: log.stepName,
            action: log.action,
            decision: log.decision,
            evidence_summary: log.evidenceSummary,
            state_transition: log.stateTransition,
            safety_decision: log.safetyDecision,
            approval_requirement: log.approvalRequirement,
            execution_result: log.executionResult,
            input_payload: log.inputPayload,
            output_payload: log.outputPayload,
            error_detail: log.errorDetail,
          });
        }
      }

      // 3. Compute and Record Reality Scorecard
      const durationMs = Date.now() - startTime;
      const { scorecardInput } = scorecardGenerator.generateScorecard(
        run.id,
        recordedScenarioResults
      );

      const scorecard = await realityTestRepo.upsertRealityScorecard(scorecardInput);

      // 4. Finalize Master Test Run
      const updatedRun = await realityTestRepo.updateTestRun(run.id, {
        status: failedCount === 0 ? "COMPLETED" : "FAILED",
        total_scenarios: scenarioDefs.length,
        passed_scenarios: passedCount,
        failed_scenarios: failedCount,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      });

      // 5. System Audit Trail (Wrap safely)
      try {
        await createAuditLog({
          event_type: "SIMULATION_RUN_COMPLETED",
          entity_type: "SIMULATION_TEST_RUN",
          entity_id: run.id,
          actor: options?.triggeredBy || "OPERATOR",
          details: {
            totalScenarios: scenarioDefs.length,
            passed: passedCount,
            failed: failedCount,
            durationMs,
            overallScore: scorecard.overall_verification_score,
          },
        });
      } catch {
        // Suppress if audit logger enforces production UUID constraints
      }

      return {
        run: updatedRun || run,
        scenarioResults: recordedScenarioResults,
        scorecard,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run an individual test scenario by ScenarioId.
   */
  async runSingleScenario(
    scenarioId: ScenarioId,
    options?: { triggeredBy?: string }
  ): Promise<RealityRunResult> {
    const def = SCENARIO_REGISTRY[scenarioId];
    if (!def) {
      throw new Error(`Scenario ${scenarioId} not found in registry.`);
    }

    const startTime = Date.now();
    const run = await realityTestRepo.createTestRun({
      trigger_mode: "MANUAL",
      realm: "SIMULATION",
      total_scenarios: 1,
      triggered_by: options?.triggeredBy || "OPERATOR",
      notes: `Single Scenario Execution: ${def.name}`,
    });

    const output = await def.run(run.id);
    const passed = output.status === "PASSED";

    const savedScenario = await realityTestRepo.recordScenarioResult({
      run_id: run.id,
      scenario_id: output.scenarioId,
      scenario_name: output.scenarioName,
      category: output.category,
      realm: "SIMULATION",
      status: output.status,
      duration_ms: output.durationMs,
      error_message: output.errorMessage,
      primary_bottleneck: output.primaryBottleneck,
      strategy_decision: output.strategyDecision,
      what_waiting_for: output.whatWaitingFor,
      human_approval_required: output.humanApprovalRequired,
      safety_invariants_verified: output.safetyInvariantsVerified,
      state_transitions: output.stateTransitions,
      evidence_flow: output.evidenceFlow,
      execution_trace: output.executionTrace,
      raw_output: output.rawOutput,
    });

    for (const log of output.auditLogs) {
      await realityTestRepo.recordSimulationAuditLog({
        run_id: run.id,
        scenario_id: output.scenarioId,
        phase: log.phase,
        step_name: log.stepName,
        action: log.action,
        decision: log.decision,
        evidence_summary: log.evidenceSummary,
        state_transition: log.stateTransition,
        safety_decision: log.safetyDecision,
        approval_requirement: log.approvalRequirement,
        execution_result: log.executionResult,
        input_payload: log.inputPayload,
        output_payload: log.outputPayload,
        error_detail: log.errorDetail,
      });
    }

    const { scorecardInput } = scorecardGenerator.generateScorecard(run.id, [savedScenario]);
    const scorecard = await realityTestRepo.upsertRealityScorecard(scorecardInput);

    const updatedRun = await realityTestRepo.updateTestRun(run.id, {
      status: passed ? "COMPLETED" : "FAILED",
      total_scenarios: 1,
      passed_scenarios: passed ? 1 : 0,
      failed_scenarios: passed ? 0 : 1,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    });

    return {
      run: updatedRun || run,
      scenarioResults: [savedScenario],
      scorecard,
    };
  }

  /**
   * Fetch current reality simulation status and latest scorecard.
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    latestRun: SimulationTestRun | null;
    latestScorecard: RealityScorecard | null;
    recentScenarios: SimulationScenarioResult[];
  }> {
    const latestRun = await realityTestRepo.getLatestTestRun();
    const latestScorecard = await realityTestRepo.getLatestRealityScorecard();
    const recentScenarios = latestRun ? await realityTestRepo.listScenarioResults(latestRun.id) : [];

    return {
      isRunning: this.isRunning,
      latestRun,
      latestScorecard,
      recentScenarios,
    };
  }

  /**
   * Clear simulation data safely.
   */
  async resetSimulation(): Promise<{
    runsDeleted: number;
    scenariosDeleted: number;
    auditLogsDeleted: number;
    scorecardsDeleted: number;
  }> {
    return await realityTestRepo.resetSimulationData();
  }
}

export const realityRunner = new RealityRunner();
