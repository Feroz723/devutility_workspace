import { runCustomerSuccessPipeline } from "@/customer-success/runner";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class CustomerSuccessCycleAdapter {
  /**
   * Executes the customer success pipeline: calculates customer health, detects churn, triages support
   */
  async execute(options?: { isDemo?: boolean }): Promise<CrossPhaseAdapterResult> {
    try {
      const isDemo = options?.isDemo ?? false;
      const result = await runCustomerSuccessPipeline({ is_demo: isDemo });

      const itemsProcessed = result.customers_evaluated + result.support_triaged;

      return {
        success: true,
        phase: 9,
        adapter_name: "CustomerSuccessCycleAdapter",
        items_processed: itemsProcessed,
        status: itemsProcessed > 0 ? "SUCCESS" : "NOTHING_ELIGIBLE",
        details: {
          job_id: result.job_id,
          customers_evaluated: result.customers_evaluated,
          health_calculated: result.health_calculated,
          churn_alerts: result.churn_alerts,
          support_triaged: result.support_triaged,
          interventions_proposed: result.interventions_proposed,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 9,
        adapter_name: "CustomerSuccessCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const customerSuccessCycleAdapter = new CustomerSuccessCycleAdapter();
