import { executeResearchCycle } from "@/research/cycle";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class ResearchCycleAdapter {
  /**
   * Runs autonomous opportunity research discovery across public rotated sources
   */
  async execute(options?: { queries?: string[]; providers?: string[]; isDemo?: boolean }): Promise<CrossPhaseAdapterResult> {
    try {
      const result = await executeResearchCycle({
        queries: options?.queries,
        providers: options?.providers,
      });

      const itemsProcessed = result.opportunitiesCreated + result.opportunitiesUpdated;

      return {
        success: result.status === "completed",
        phase: 3,
        adapter_name: "ResearchCycleAdapter",
        items_processed: itemsProcessed,
        status: itemsProcessed > 0 ? "SUCCESS" : "NOTHING_ELIGIBLE",
        details: {
          run_id: result.runId,
          raw_items_found: result.rawItemsFound,
          opportunities_created: result.opportunitiesCreated,
          opportunities_updated: result.opportunitiesUpdated,
          duration_ms: result.durationMs,
        },
        error: result.errors?.length ? result.errors.join("; ") : null,
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 3,
        adapter_name: "ResearchCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const researchCycleAdapter = new ResearchCycleAdapter();
