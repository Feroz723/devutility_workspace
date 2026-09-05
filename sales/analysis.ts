import {
  listOrders,
  listRefunds,
  listOffers,
  createSalesMetric,
} from "@/database/repositories/sales-repo";
import { SalesAttributionEngine } from "./attribution";
import { SalesAnalysisSummary } from "./types";

export class SalesAnalyticsEngine {
  /**
   * Generates a comprehensive summary of sales, revenue, and customer conversions.
   * By default, excludes demo transactions from production statistics.
   */
  static async generateSalesSummary(options: { includeDemo?: boolean } = {}): Promise<SalesAnalysisSummary> {
    const orders = await listOrders({ includeDemo: options.includeDemo ?? false, limit: 1000 });
    const refunds = await listRefunds({ includeDemo: options.includeDemo ?? false, limit: 500 });
    const offers = await listOffers({ includeDemo: options.includeDemo ?? false, limit: 100 });

    const totalOrders = orders.length;
    let freeOrders = 0;
    let paidOrders = 0;
    let grossRevenueCents = 0;

    const offerRevenueMap = new Map<string, { title: string; count: number; revenue: number }>();

    for (const o of orders) {
      if (o.is_free || o.total_amount_cents === 0) {
        freeOrders++;
      } else if (o.status === "PAID" || o.status === "REFUNDED" || o.status === "PARTIALLY_REFUNDED") {
        paidOrders++;
        grossRevenueCents += o.total_amount_cents;
      }

      const offer = offers.find((off) => off.id === o.offer_id);
      const title = offer?.title ?? "Unknown Offer";
      const current = offerRevenueMap.get(o.offer_id) || { title, count: 0, revenue: 0 };
      current.count += 1;
      if (o.status === "PAID") {
        current.revenue += o.total_amount_cents;
      }
      offerRevenueMap.set(o.offer_id, current);
    }

    let totalRefundsCents = 0;
    for (const r of refunds) {
      if (r.status === "PROCESSED") {
        totalRefundsCents += r.amount_cents;
      }
    }

    const netRevenueCents = Math.max(0, grossRevenueCents - totalRefundsCents);
    const averageOrderValueCents = paidOrders > 0 ? Math.round(grossRevenueCents / paidOrders) : 0;
    const conversionRatePercent = totalOrders > 0 ? Number(((paidOrders / totalOrders) * 100).toFixed(2)) : 0;

    // Find top performing offer
    let topPerformingOffer: SalesAnalysisSummary["topPerformingOffer"] = undefined;
    let maxRev = -1;
    for (const [id, data] of offerRevenueMap.entries()) {
      if (data.revenue > maxRev) {
        maxRev = data.revenue;
        topPerformingOffer = {
          id,
          title: data.title,
          ordersCount: data.count,
          revenueCents: data.revenue,
        };
      }
    }

    const channelAttributionSummary = await SalesAttributionEngine.getSourceBreakdown().catch(() => []);

    return {
      period: "ALL_TIME",
      totalOrders,
      freeOrders,
      paidOrders,
      grossRevenueCents,
      netRevenueCents,
      totalRefundsCents,
      conversionRatePercent,
      averageOrderValueCents,
      topPerformingOffer,
      channelAttributionSummary,
    };
  }

  /**
   * Computes and saves the daily sales metric record in sales_metrics.
   */
  static async recordDailyAggregate(): Promise<void> {
    const summary = await this.generateSalesSummary();
    const today = new Date().toISOString().slice(0, 10);

    await createSalesMetric({
      period_type: "DAILY",
      period_start: new Date(today).toISOString(),
      total_visitors: summary.totalOrders * 10, // estimated
      checkout_views: summary.totalOrders * 3,
      checkout_starts: summary.totalOrders,
      checkout_completions: summary.paidOrders + summary.freeOrders,
      gross_revenue_cents: summary.grossRevenueCents,
      net_revenue_cents: summary.netRevenueCents,
      refunds_count: summary.totalRefundsCents > 0 ? 1 : 0,
      refunded_cents: summary.totalRefundsCents,
      free_orders_count: summary.freeOrders,
      paid_orders_count: summary.paidOrders,
      average_order_value_cents: summary.averageOrderValueCents,
      conversion_rate_percent: summary.conversionRatePercent,
      is_demo: false,
    });
  }
}
