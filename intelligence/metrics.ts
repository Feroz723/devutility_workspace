import {
  createBusinessMetric,
  getLatestBusinessSnapshot,
} from "@/database/repositories/intelligence-repo";
import { listCheckoutSessions, listOrders, listRefunds } from "@/database/repositories/sales-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { FunnelMetricsResult } from "./types";
import type { IntelligenceConfidence } from "@/types/intelligence";

export async function aggregateBusinessMetrics(options?: {
  is_demo?: boolean;
}): Promise<FunnelMetricsResult> {
  const isDemo = options?.is_demo ?? false;
  const snapshot = await getLatestBusinessSnapshot({ is_demo: isDemo });

  const visitors = snapshot?.total_visitors_count ?? 0;
  const leads = snapshot?.total_leads_count ?? 0;
  const signups = snapshot?.total_signups_count ?? 0;
  const customers = snapshot?.total_customers_count ?? 0;
  const grossRevenue = Number(snapshot?.total_revenue_inr) || 0;
  const netRevenue = Number(snapshot?.net_revenue_inr) || 0;

  const [checkoutSessions, orders, refunds] = await Promise.all([
    listCheckoutSessions({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listOrders({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listRefunds({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
  ]);

  const checkouts = checkoutSessions.length;
  const paidOrders = orders.filter((o: any) => o.status === "PAID" || o.payment_status === "PAID").length;
  const totalRefundsCount = refunds.filter((r: any) => r.status === "PROCESSED" || r.status === "APPROVED").length;


  const hasSufficientData = visitors >= 10 && paidOrders >= 3;
  const confidence: IntelligenceConfidence = hasSufficientData
    ? (visitors >= 100 ? "HIGH" : "MEDIUM")
    : "INSUFFICIENT_DATA";

  const leadConversion = visitors > 0 ? Math.round((leads / visitors) * 10000) / 100 : null;
  const checkoutConversion = visitors > 0 ? Math.round((checkouts / visitors) * 10000) / 100 : null;
  const paymentConversion = checkouts > 0 ? Math.round((paidOrders / checkouts) * 10000) / 100 : null;
  const refundRate = paidOrders > 0 ? Math.round((totalRefundsCount / paidOrders) * 10000) / 100 : null;

  const aov = paidOrders > 0 ? Math.round((grossRevenue / paidOrders) * 100) / 100 : null;
  const rpv = visitors > 0 ? Math.round((grossRevenue / visitors) * 100) / 100 : null;
  const rpc = customers > 0 ? Math.round((grossRevenue / customers) * 100) / 100 : null;

  // Record individual metrics
  const metricEntries = [
    { name: "TRAFFIC_VISITORS", category: "FUNNEL", value: visitors, unit: "COUNT" },
    { name: "LEAD_CONVERSION_RATE", category: "FUNNEL", value: leadConversion, unit: "PERCENT" },
    { name: "CHECKOUT_CONVERSION_RATE", category: "FUNNEL", value: checkoutConversion, unit: "PERCENT" },
    { name: "PAYMENT_CONVERSION_RATE", category: "FUNNEL", value: paymentConversion, unit: "PERCENT" },
    { name: "REFUND_RATE", category: "FINANCIAL", value: refundRate, unit: "PERCENT" },
    { name: "AVERAGE_ORDER_VALUE", category: "FINANCIAL", value: aov, unit: "INR" },
    { name: "REVENUE_PER_VISITOR", category: "UNIT", value: rpv, unit: "INR" },
    { name: "REVENUE_PER_CUSTOMER", category: "UNIT", value: rpc, unit: "INR" },
    { name: "GROSS_REVENUE", category: "FINANCIAL", value: grossRevenue, unit: "INR" },
    { name: "NET_REVENUE", category: "FINANCIAL", value: netRevenue, unit: "INR" },
  ];

  for (const m of metricEntries) {
    await createBusinessMetric({
      metric_name: m.name,
      metric_category: m.category,
      metric_value: m.value,
      metric_unit: m.unit,
      has_sufficient_data: hasSufficientData,
      sample_size: visitors,
      confidence: confidence,
      source_phase: "CROSS_PHASE_INTELLIGENCE",
      is_demo: isDemo,
    });
  }

  await createAuditLog({
    event_type: "BUSINESS_METRICS_CALCULATED",
    entity_type: "business_metrics",
    actor: "intelligence_engine",
    details: {
      visitors,
      paidOrders,
      grossRevenue,
      confidence,
      hasSufficientData,
    },
  });

  return {
    visitors,
    leads,
    signups,
    checkouts,
    paid_orders: paidOrders,
    lead_conversion_percent: leadConversion,
    checkout_conversion_percent: checkoutConversion,
    payment_conversion_percent: paymentConversion,
    refund_rate_percent: refundRate,
    gross_revenue_inr: grossRevenue,
    net_revenue_inr: netRevenue,
    average_order_value_inr: aov,
    revenue_per_visitor_inr: rpv,
    revenue_per_customer_inr: rpc,
    has_sufficient_data: hasSufficientData,
  };
}

export const businessMetricsEngine = {
  computeFunnelMetrics: async (isDemo: boolean = false) => aggregateBusinessMetrics({ is_demo: isDemo }),
};

