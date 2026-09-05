import { autonomousIntelligenceRunner } from "@/intelligence/runner";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class IntelligenceCycleAdapter {
  /**
   * Executes the autonomous business intelligence cycle: snapshots, unit economics,
   * product & channel evaluations, risks, cohort analysis, and portfolio decisions
   */
  async execute(options?: { isDemo?: boolean }): Promise<CrossPhaseAdapterResult> {
    try {
      const isDemo = options?.isDemo ?? false;
      const result = await autonomousIntelligenceRunner.runIntelligenceCycle(isDemo);

      const itemsProcessed = result.products_evaluated + result.channels_evaluated + result.offers_evaluated;

      return {
        success: result.status === "COMPLETED",
        phase: 10,
        adapter_name: "IntelligenceCycleAdapter",
        items_processed: itemsProcessed,
        status: result.status === "COMPLETED" ? "SUCCESS" : "FAILED",
        details: {
          job_id: result.job_id,
          snapshot_id: result.snapshot_id,
          products_evaluated: result.products_evaluated,
          channels_evaluated: result.channels_evaluated,
          offers_evaluated: result.offers_evaluated,
          risks_detected: result.risks_detected,
          decisions_proposed: result.decisions_proposed,
          execution_duration_ms: result.execution_duration_ms,
        },
        error: result.error || null,
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 10,
        adapter_name: "IntelligenceCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const intelligenceCycleAdapter = new IntelligenceCycleAdapter();
