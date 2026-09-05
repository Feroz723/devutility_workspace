import {
  upsertProductPerformance,
  getProductPerformance,
} from "@/database/repositories/intelligence-repo";
import { getProductById } from "@/database/repositories/product-repo";
import { listOrders, listRefunds } from "@/database/repositories/sales-repo";
import {
  listCustomerActivations,
  listCustomerSupportRequests,
  listCustomerFeedback,
  listCustomerChurn,
  listCustomerSessions,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { ProductPerformance, ProductPerformanceTier } from "@/types/intelligence";

export async function evaluateProductPerformance(
  productId: string,
  isDemo?: boolean
): Promise<ProductPerformance> {
  const [
    product,
    orders,
    refunds,
    activations,
    supportRequests,
    feedback,
    churns,
    sessions,
  ] = await Promise.all([
    getProductById(productId).catch(() => null),
    listOrders({ productId, includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listRefunds({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerActivations({ product_id: productId, is_demo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerSupportRequests({ product_id: productId, is_demo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerFeedback({ product_id: productId, is_demo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerChurn({ product_id: productId, is_demo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerSessions({ product_id: productId, is_demo: isDemo, limit: 1000 }).catch(() => []),
  ]);

  const paidOrders = orders.filter((o: any) => o.status === "PAID" || o.payment_status === "PAID");
  const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount_cents) ? Number(o.total_amount_cents) / 100 : Number(o.amount) || 0), 0);
  const paidCustomersCount = new Set(paidOrders.map((o: any) => o.customer_id)).size;

  const totalUsers = activations.length;
  const activatedCount = activations.filter((a) => a.status === "ACTIVATED").length;
  const activationRate = totalUsers > 0 ? Math.round((activatedCount / totalUsers) * 100) : 0;

  const totalRefundsCount = refunds.filter((r: any) => r.status === "PROCESSED" || r.status === "APPROVED").length;
  const refundRate = paidOrders.length > 0 ? Math.round((totalRefundsCount / paidOrders.length) * 100) : 0;

  const confirmedChurnCount = churns.filter((c) => c.churn_status === "CONFIRMED_CHURN").length;
  const churnRate = totalUsers > 0 ? Math.round((confirmedChurnCount / totalUsers) * 100) : 0;

  const supportBurden = supportRequests.length;
  const featureRequestsCount = feedback.filter((f) => f.feedback_type === "FEATURE_REQUEST").length;
  const positiveFeedbackCount = feedback.filter((f) => f.sentiment === "POSITIVE").length;
  const negativeFeedbackCount = feedback.filter((f) => f.sentiment === "NEGATIVE").length;

  // Outcome score based on feedback sentiment ratio
  const outcomeScore = feedback.length > 0
    ? Math.round((positiveFeedbackCount / feedback.length) * 100)
    : 50;

  // Traffic / sessions
  const trafficCount = sessions.length;

  // Performance classification
  let tier: ProductPerformanceTier = "INSUFFICIENT_DATA";
  let summary = "Insufficient exposure or users to evaluate performance.";

  if (totalUsers < 3 && trafficCount < 10) {
    tier = "INSUFFICIENT_DATA";
    summary = "Product is in early launch stage with <3 users tracked.";
  } else if (totalRevenue > 0 && activationRate >= 50 && refundRate <= 10 && churnRate <= 20) {
    tier = "WINNER";
    summary = "Strong revenue generation, high activation rate, and low refund/churn rates.";
  } else if (activationRate >= 40 && positiveFeedbackCount >= negativeFeedbackCount) {
    tier = "PROMISING";
    summary = "Healthy activation and positive customer signals; ready for distribution expansion.";
  } else if (activationRate >= 25 && churnRate <= 30) {
    tier = "STABLE";
    summary = "Consistent customer usage with manageable support volume.";
  } else if (supportBurden >= 3 || activationRate < 25) {
    if (negativeFeedbackCount > positiveFeedbackCount && churnRate >= 40) {
      tier = "STOP_CANDIDATE";
      summary = "High churn rate, negative sentiment, and activation friction across multiple cohorts.";
    } else {
      tier = "NEEDS_IMPROVEMENT";
      summary = "Product experiences activation drop-off or elevated support requests requiring feature refinements.";
    }
  } else {
    tier = "WEAK";
    summary = "Low user activity and weak conversion metrics.";
  }

  const evidence = {
    total_users: totalUsers,
    paying_customers: paidCustomersCount,
    revenue_inr: totalRevenue,
    activation_rate: activationRate,
    support_tickets: supportBurden,
    churn_count: confirmedChurnCount,
  };

  const performance = await upsertProductPerformance({
    product_id: productId,
    performance_tier: tier,
    traffic_count: trafficCount,
    users_count: totalUsers,
    customers_count: paidCustomersCount,
    activation_rate_percent: activationRate,
    revenue_inr: totalRevenue,
    refund_rate_percent: refundRate,
    retention_rate_percent: Math.max(0, 100 - churnRate),
    churn_rate_percent: churnRate,
    support_burden_score: supportBurden,
    feature_requests_count: featureRequestsCount,
    customer_outcomes_score: outcomeScore,
    evaluation_summary: summary,
    evidence: evidence,
    is_demo: isDemo,
  });

  await createAuditLog({
    event_type: "PRODUCT_EVALUATED",
    entity_type: "product_performance",
    entity_id: performance.id,
    actor: "intelligence_engine",
    details: {
      product_id: productId,
      performance_tier: tier,
      revenue_inr: totalRevenue,
      activation_rate: activationRate,
    },
  });

  return performance;
}

export const productPerformanceEvaluator = {
  evaluateProduct: async (productId: string, isDemo: boolean = false) =>
    evaluateProductPerformance(productId, isDemo),
};

