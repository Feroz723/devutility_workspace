import { SalesRunner } from "@/sales/runner";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class SalesCycleAdapter {
  /**
   * Executes the sales cycle: packaging eligible products into offers, retrying deliveries, calculating sales metrics
   */
  async execute(): Promise<CrossPhaseAdapterResult> {
    try {
      const result = await SalesRunner.runCycle();

      const itemsProcessed = result.offersPublished + result.pendingDeliveriesProcessed;

      return {
        success: result.errors.length === 0,
        phase: 8,
        adapter_name: "SalesCycleAdapter",
        items_processed: itemsProcessed,
        status: itemsProcessed > 0 ? "SUCCESS" : "NOTHING_ELIGIBLE",
        details: {
          offers_checked: result.offersChecked,
          offers_published: result.offersPublished,
          pending_deliveries_processed: result.pendingDeliveriesProcessed,
          successful_deliveries: result.successfulDeliveries,
          failed_deliveries: result.failedDeliveries,
        },
        error: result.errors?.length ? result.errors.join("; ") : null,
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 8,
        adapter_name: "SalesCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const salesCycleAdapter = new SalesCycleAdapter();
