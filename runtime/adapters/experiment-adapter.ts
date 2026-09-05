import { listExperiments } from "@/database/repositories/experiment-repo";
import { experimentRunner } from "@/experiments/runner";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class ExperimentCycleAdapter {
  /**
   * Evaluates active and ready experiments, transitioning eligible experiments through stages
   */
  async execute(options?: { isDemo?: boolean }): Promise<CrossPhaseAdapterResult> {
    try {
      const isDemo = options?.isDemo ?? false;
      const { experiments: allExperiments } = await listExperiments({ limit: 50 });
      const experiments = allExperiments.filter((e) => e.is_demo === isDemo);

      let processedCount = 0;
      const processedIds: string[] = [];

      // 1. Advance READY experiments to RUNNING
      const readyExps = experiments.filter((e) => e.status === "READY");
      for (const exp of readyExps.slice(0, 2)) {
        await experimentRunner.start(exp.id);
        processedCount++;
        processedIds.push(exp.id);
      }

      // 2. Analyze RUNNING experiments that have reached target duration or signups
      const runningExps = experiments.filter((e) => e.status === "RUNNING");
      for (const exp of runningExps.slice(0, 2)) {
        await experimentRunner.analyze(exp.id);
        processedCount++;
        processedIds.push(exp.id);
      }

      if (processedCount === 0) {
        return {
          success: true,
          phase: 5,
          adapter_name: "ExperimentCycleAdapter",
          items_processed: 0,
          status: "NOTHING_ELIGIBLE",
          details: { message: "No experiments currently ready for state transition or analysis." },
        };
      }

      return {
        success: true,
        phase: 5,
        adapter_name: "ExperimentCycleAdapter",
        items_processed: processedCount,
        status: "SUCCESS",
        details: { processed_experiment_ids: processedIds },
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 5,
        adapter_name: "ExperimentCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const experimentCycleAdapter = new ExperimentCycleAdapter();
