import {
  upsertOfferPerformance,
  getOfferPerformance,
} from "@/database/repositories/intelligence-repo";
import {
  getOfferById,
  listCheckoutSessions,
  listOrders,
  listRefunds,
} from "@/database/repositories/sales-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { OfferPerformance, OfferPerformanceTier } from "@/types/intelligence";

export async function evaluateOfferPerformance(
  offerId: string,
  isDemo?: boolean
): Promise<OfferPerformance> {
  const [offer, sessions, orders, refunds] = await Promise.all([
    getOfferById(offerId).catch(() => null),
    listCheckoutSessions({ offerId, includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listOrders({ offerId, includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listRefunds({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
  ]);

  const viewsCount = Math.max(sessions.length * 2, 1);
  const checkoutsStarted = sessions.length;
  const paidOrders = orders.filter((o: any) => o.status === "PAID" || o.payment_status === "PAID");
  const paymentsCompleted = paidOrders.length;

  const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount_cents) ? Number(o.total_amount_cents) / 100 : Number(o.amount) || 0), 0);
  const offerRefunds = refunds.filter((r: any) => r.order_id && orders.some((o: any) => o.id === r.order_id));
  const refundsCount = offerRefunds.length;

  const conversionRate = checkoutsStarted > 0 ? Math.round((paymentsCompleted / checkoutsStarted) * 10000) / 100 : 0;
  const refundRate = paymentsCompleted > 0 ? Math.round((refundsCount / paymentsCompleted) * 10000) / 100 : 0;
  const aov = paymentsCompleted > 0 ? Math.round((totalRevenue / paymentsCompleted) * 100) / 100 : 0;

  let tier: OfferPerformanceTier = "PROMISING";
  let recommendations = "Offer is in active validation.";

  if (paymentsCompleted >= 3 && conversionRate >= 10 && refundRate <= 5) {
    tier = "STRONG";
    recommendations = "High converting offer with satisfied buyers; candidate for wider promotion.";
  } else if (refundRate >= 20 && paymentsCompleted >= 2) {
    tier = "REQUIRES_ITERATION";
    recommendations = "Elevated refund rate indicates expectation gap; review offer promises and deliverable quality.";
  } else if (checkoutsStarted >= 10 && paymentsCompleted === 0) {
    tier = "WEAK";
    recommendations = "Customers initiate checkout but abandon before payment; consider price testing or adding payment options.";
  } else if (checkoutsStarted >= 25 && paymentsCompleted === 0) {
    tier = "STOP";
    recommendations = "Consistent zero payment conversion after significant interest; revise positioning completely.";
  } else {
    tier = "PROMISING";
    recommendations = "Initial test conversions recorded; maintain pricing and observe repeat behavior.";
  }

  const performance = await upsertOfferPerformance({
    offer_id: offerId,
    performance_tier: tier,
    views_count: viewsCount,
    checkouts_started_count: checkoutsStarted,
    payments_completed_count: paymentsCompleted,
    conversion_rate_percent: conversionRate,
    refunds_count: refundsCount,
    refund_rate_percent: refundRate,
    average_order_value_inr: aov,
    total_revenue_inr: totalRevenue,
    repeat_purchases_count: 0,
    recommendations,
    is_demo: isDemo,
  });

  await createAuditLog({
    event_type: "OFFER_EVALUATED",
    entity_type: "offer_performance",
    entity_id: performance.id,
    actor: "intelligence_engine",
    details: {
      offer_id: offerId,
      performance_tier: tier,
      total_revenue_inr: totalRevenue,
      conversion_rate_percent: conversionRate,
    },
  });

  return performance;
}

export const offerPerformanceEvaluator = {
  evaluateOffer: async (offerId: string, isDemo: boolean = false) =>
    evaluateOfferPerformance(offerId, isDemo),
};
