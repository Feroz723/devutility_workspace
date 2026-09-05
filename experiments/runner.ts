import {
  getExperimentById,
  updateExperiment,
  createExperimentJob,
  updateExperimentJob,
  listMetricsForExperiment,
} from "@/database/repositories/experiment-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { canTransition } from "./state-machine";
import { canExecute } from "./guard";
import { analyzeExperiment } from "./analysis";
import type { Experiment, ExperimentStatus } from "@/types/experiment";
import type { ExperimentAnalysisResult } from "./types";

export class ExperimentRunner {
  /**
   * Prepares the experiment (sets up local artifacts, steps).
   */
  async prepare(experimentId: string): Promise<Experiment> {
    const exp = await this.requireExperiment(experimentId);
    this.ensureTransition(exp.status, "SETUP");

    const job = await createExperimentJob({
      experiment_id: experimentId,
      status: "RUNNING",
    });

    const updated = await updateExperiment(experimentId, {
      status: "SETUP",
      stage: "BUILD",
    });

    await updateExperimentJob(job.id, { status: "COMPLETED" });

    await createAuditLog({
      event_type: "EXPERIMENT_SETUP",
      entity_type: "experiment",
      entity_id: experimentId,
      actor: "experiment_runner",
      details: { title: exp.title },
    });

    return updated!;
  }

  /**
   * Validates zero-spend and prerequisites before marking READY.
   */
  async validate(experimentId: string): Promise<{ valid: boolean; reason: string }> {
    const exp = await this.requireExperiment(experimentId);
    const guard = canExecute(exp);

    if (!guard.allowed) {
      return { valid: false, reason: guard.reason };
    }

    this.ensureTransition(exp.status, "READY");

    await updateExperiment(experimentId, {
      status: "READY",
      stage: "LAUNCH",
    });

    return { valid: true, reason: guard.reason };
  }

  /**
   * Starts the experiment (transitions to RUNNING).
   */
  async start(experimentId: string): Promise<Experiment> {
    const exp = await this.requireExperiment(experimentId);

    // Verify zero-spend guard
    const guard = canExecute(exp);
    if (!guard.allowed) {
      throw new Error(`Cannot start experiment: ${guard.reason}`);
    }

    this.ensureTransition(exp.status, "RUNNING");

    const updated = await updateExperiment(experimentId, {
      status: "RUNNING",
      stage: "LAUNCH",
      start_date: exp.start_date || new Date().toISOString().split("T")[0],
    });

    await createAuditLog({
      event_type: "EXPERIMENT_STARTED",
      entity_type: "experiment",
      entity_id: experimentId,
      actor: "experiment_runner",
      details: { channel: exp.channel, cost: exp.estimated_cost_inr },
    });

    return updated!;
  }

  /**
   * Pauses an active experiment.
   */
  async pause(experimentId: string): Promise<Experiment> {
    const exp = await this.requireExperiment(experimentId);
    this.ensureTransition(exp.status, "PAUSED");

    const updated = await updateExperiment(experimentId, {
      status: "PAUSED",
    });

    await createAuditLog({
      event_type: "EXPERIMENT_PAUSED",
      entity_type: "experiment",
      entity_id: experimentId,
      actor: "experiment_runner",
      details: {},
    });

    return updated!;
  }

  /**
   * Resumes a paused experiment.
   */
  async resume(experimentId: string): Promise<Experiment> {
    const exp = await this.requireExperiment(experimentId);
    this.ensureTransition(exp.status, "RUNNING");

    const updated = await updateExperiment(experimentId, {
      status: "RUNNING",
    });

    await createAuditLog({
      event_type: "EXPERIMENT_RESUMED",
      entity_type: "experiment",
      entity_id: experimentId,
      actor: "experiment_runner",
      details: {},
    });

    return updated!;
  }

  /**
   * Stops an experiment immediately.
   */
  async stop(experimentId: string, reason = "Operator stopped"): Promise<Experiment> {
    const exp = await this.requireExperiment(experimentId);
    this.ensureTransition(exp.status, "STOPPED");

    const updated = await updateExperiment(experimentId, {
      status: "STOPPED",
      result: "STOPPED",
      decision: "STOP",
      end_date: new Date().toISOString().split("T")[0],
    });

    await createAuditLog({
      event_type: "EXPERIMENT_STOPPED",
      entity_type: "experiment",
      entity_id: experimentId,
      actor: "experiment_runner",
      details: { reason },
    });

    return updated!;
  }

  /**
   * Marks experiment as COMPLETED once time window expires.
   */
  async complete(experimentId: string): Promise<Experiment> {
    const exp = await this.requireExperiment(experimentId);
    this.ensureTransition(exp.status, "COMPLETED");

    const updated = await updateExperiment(experimentId, {
      status: "COMPLETED",
      stage: "RESULTS",
      end_date: exp.end_date || new Date().toISOString().split("T")[0],
    });

    await createAuditLog({
      event_type: "EXPERIMENT_COMPLETED",
      entity_type: "experiment",
      entity_id: experimentId,
      actor: "experiment_runner",
      details: {},
    });

    return updated!;
  }

  /**
   * Analyzes experiment metrics and declares final result.
   */
  async analyze(experimentId: string): Promise<{
    experiment: Experiment;
    analysis: ExperimentAnalysisResult;
  }> {
    const exp = await this.requireExperiment(experimentId);

    // If currently running, complete first
    if (exp.status === "RUNNING") {
      await this.complete(experimentId);
    }

    const metrics = await listMetricsForExperiment(experimentId);
    const analysis = analyzeExperiment(exp, metrics);

    // Transition status to result status (WINNER, PROMISING, ITERATE, STOPPED, FAILED)
    const newStatus: ExperimentStatus =
      analysis.result === "WINNER"
        ? "WINNER"
        : analysis.result === "PROMISING"
        ? "PROMISING"
        : analysis.result === "ITERATE"
        ? "ITERATE"
        : analysis.result === "STOPPED"
        ? "STOPPED"
        : analysis.result === "FAILED"
        ? "FAILED"
        : "COMPLETED";

    const updated = await updateExperiment(experimentId, {
      status: newStatus,
      result: analysis.result,
      decision: analysis.result === "WINNER" ? "SCALE" : analysis.result === "PROMISING" ? "ITERATE" : "REVIEW",
      learning_data: analysis.learnings,
    });

    await createAuditLog({
      event_type: "EXPERIMENT_ANALYZED",
      entity_type: "experiment",
      entity_id: experimentId,
      actor: "experiment_runner",
      details: {
        result: analysis.result,
        metrics_count: metrics.length,
        summary: analysis.decision_summary,
      },
    });

    return { experiment: updated!, analysis };
  }

  private async requireExperiment(id: string): Promise<Experiment> {
    const exp = await getExperimentById(id);
    if (!exp) throw new Error(`Experiment "${id}" not found.`);
    return exp;
  }

  private ensureTransition(from: ExperimentStatus, to: ExperimentStatus): void {
    const check = canTransition(from, to);
    if (!check.allowed) {
      throw new Error(check.reason);
    }
  }
}

export const experimentRunner = new ExperimentRunner();
