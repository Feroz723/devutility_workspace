import { listProducts } from "@/database/repositories/product-repo";
import { listOffers } from "@/database/repositories/sales-repo";
import { SalesEligibilityChecker } from "./eligibility";
import { OfferManager } from "./offer";
import { DeliveryEngine } from "./delivery";
import { SalesAnalyticsEngine } from "./analysis";
import { SalesRunnerCycleResult } from "./types";

export class SalesRunner {
  /**
   * Executes an autonomous sales operations cycle:
   * 1. Detects eligible validated products and packages them into offers.
   * 2. Retries pending digital deliveries.
   * 3. Aggregates daily conversion metrics.
   */
  static async runCycle(): Promise<SalesRunnerCycleResult> {
    const cycleTimestamp = new Date().toISOString();
    const errors: string[] = [];
    let offersChecked = 0;
    let offersPublished = 0;

    // 1. Check eligible products for commercial or free offer creation
    try {
      const productResult = await listProducts({ status: "READY", limit: 20 }).catch(() => ({ products: [], total: 0 }));
      const readyProducts = productResult.products;
      offersChecked = readyProducts.length;

      for (const product of readyProducts) {
        try {
          const eligibility = await SalesEligibilityChecker.checkProductEligibility(product.id);
          if (eligibility.eligible && eligibility.checks.noActiveBlockingOffer) {
            const offer = await OfferManager.createOfferFromProduct({
              productId: product.id,
              isFree: product.product_type === "FREE_TOOL",
            });
            await OfferManager.publishOffer(offer.id);
            offersPublished++;
          }
        } catch (err: any) {
          errors.push(`Offer creation failed for product ${product.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      errors.push(`Product discovery failed: ${err.message}`);
    }

    // 2. Retry pending deliveries
    let pendingDeliveriesProcessed = 0;
    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    try {
      const deliveryRes = await DeliveryEngine.retryPendingDeliveries();
      pendingDeliveriesProcessed = deliveryRes.retried;
      successfulDeliveries = deliveryRes.succeeded;
      failedDeliveries = pendingDeliveriesProcessed - successfulDeliveries;
    } catch (err: any) {
      errors.push(`Delivery retry cycle failed: ${err.message}`);
    }

    // 3. Aggregate daily metrics
    let metricsCalculated = false;
    try {
      await SalesAnalyticsEngine.recordDailyAggregate();
      metricsCalculated = true;
    } catch (err: any) {
      errors.push(`Metrics aggregation failed: ${err.message}`);
    }

    return {
      cycleTimestamp,
      offersChecked,
      offersPublished,
      pendingDeliveriesProcessed,
      successfulDeliveries,
      failedDeliveries,
      refundsProcessed: 0,
      metricsCalculated,
      errors,
    };
  }
}
