import { distributionRepo } from "@/database/repositories/distribution-repo";
import { runDistributionPipeline } from "@/distribution/runner";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class DistributionCycleAdapter {
  /**
   * Scans for active or scheduled campaigns and executes the distribution pipeline
   */
  async execute(options?: { isDemo?: boolean }): Promise<CrossPhaseAdapterResult> {
    try {
      const isDemo = options?.isDemo ?? false;
      const { campaigns } = await distributionRepo.listCampaigns({ is_demo: isDemo, limit: 10 });
      const active = campaigns.filter((c) => c.status === "READY" || c.status === "RUNNING" || c.status === "APPROVED");

      if (active.length === 0) {
        return {
          success: true,
          phase: 7,
          adapter_name: "DistributionCycleAdapter",
          items_processed: 0,
          status: "NOTHING_ELIGIBLE",
          details: { message: "No active or ready distribution campaigns to dispatch." },
        };
      }

      let processed = 0;
      const results: Record<string, any>[] = [];

      for (const camp of active.slice(0, 3)) {
        const res = await runDistributionPipeline({ campaign_id: camp.id });
        results.push({
          campaign_id: camp.id,
          name: camp.name,
          actions_queued: res.actions_queued,
          auto_published: res.auto_published,
          manual_actions_required: res.manual_actions_required,
        });
        processed++;
      }

      return {
        success: true,
        phase: 7,
        adapter_name: "DistributionCycleAdapter",
        items_processed: processed,
        status: "SUCCESS",
        details: { campaigns_processed: results },
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 7,
        adapter_name: "DistributionCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const distributionCycleAdapter = new DistributionCycleAdapter();
