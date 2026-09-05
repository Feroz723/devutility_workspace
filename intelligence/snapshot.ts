import {
  createBusinessSnapshot,
  getLatestBusinessSnapshot,
} from "@/database/repositories/intelligence-repo";
import { listOpportunities } from "@/database/repositories/opportunity-repo";
import { listExperiments } from "@/database/repositories/experiment-repo";
import { listProducts } from "@/database/repositories/product-repo";
import {
  listCampaigns,
  listAttributions,
  listDistributionMetrics,
} from "@/database/repositories/distribution-repo";
import {
  listCustomers,
  listOrders,
  listRefunds,
} from "@/database/repositories/sales-repo";
import {
  listCustomerActivations,
  listCustomerChurn,
  listCustomerSupportRequests,
  listCustomerRetention,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { BusinessSnapshot } from "@/types/intelligence";

export interface GenerateSnapshotOptions {
  snapshot_date?: string;
  is_demo?: boolean;
}

export async function generateBusinessSnapshot(
  options?: GenerateSnapshotOptions
): Promise<BusinessSnapshot> {
  const isDemo = options?.is_demo ?? false;
  const snapshotDate = options?.snapshot_date || new Date().toISOString().split("T")[0] || new Date().toISOString().substring(0, 10);

  // 1. Gather counts from prior phases
  const [
    opportunities,
    experiments,
    products,
    campaignsRes,
    leads,
    distMetricsRes,
    customers,
    orders,
    refunds,
    activations,
    churns,
    supportTickets,
    retentions,
  ] = await Promise.all([
    listOpportunities().then((r) => r.opportunities).catch(() => []),
    listExperiments().then((r) => r.experiments).catch(() => []),
    listProducts().then((r) => r.products).catch(() => []),
    listCampaigns({ is_demo: isDemo }).catch(() => ({ campaigns: [], total: 0 })),
    listAttributions({ is_demo: isDemo }).catch(() => []),
    listDistributionMetrics({ is_demo: isDemo }).catch(() => ({ metrics: [], total: 0 })),
    listCustomers({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listOrders({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listRefunds({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerActivations({ is_demo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerChurn({ churn_status: "CONFIRMED_CHURN", is_demo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerSupportRequests({ status: "OPEN", is_demo: isDemo, limit: 1000 }).catch(() => []),
    listCustomerRetention({ is_demo: isDemo, limit: 30 }).catch(() => []),
  ]);

  const campaigns = campaignsRes.campaigns || [];
  const distMetrics = distMetricsRes.metrics || [];

  // Active counts
  const activeOpportunities = opportunities.filter((o: any) => o.status !== "ARCHIVED" && o.status !== "REJECTED").length;
  const activeExperiments = experiments.filter((e: any) => e.status === "ACTIVE" || e.status === "RUNNING").length;
  const activeProducts = products.filter((p: any) => p.status === "ACTIVE" || p.status === "LIVE").length;
  const activeCampaigns = campaigns.filter((c: any) => c.status === "ACTIVE" || c.status === "LIVE").length;

  // Visitors from distribution metrics
  let totalVisitors = 0;
  for (const m of distMetrics) {
    if (m.metric_name === "PAGE_VIEWS" || m.metric_name === "IMPRESSIONS" || m.metric_name === "CLICKS") {
      totalVisitors += Number(m.metric_value) || 0;
    }
  }


  const totalLeads = leads.length;
  const totalSignups = customers.length;
  const paidCustomers = customers.filter((c: any) => c.status === "CUSTOMER" || c.status === "ACTIVE").length;
  const activatedCustomers = activations.filter((a: any) => a.activation_status === "ACTIVATED" || a.status === "ACTIVATED").length;

  // Financial aggregates
  let totalRevenue = 0;
  for (const ord of orders) {
    if (ord.status === "PAID" || (ord as any).payment_status === "PAID") {
      totalRevenue += Number(ord.total_amount_cents) ? Number(ord.total_amount_cents) / 100 : Number((ord as any).amount) || 0;
    }
  }

  let totalRefunds = 0;
  for (const ref of refunds) {
    if (ref.status === "PROCESSED" || ref.status === "APPROVED") {
      totalRefunds += Number(ref.amount_cents) ? Number(ref.amount_cents) / 100 : Number((ref as any).amount) || 0;
    }
  }

  const netRevenue = Math.max(0, totalRevenue - totalRefunds);

  // Retention rate from latest cohort
  let activeRetentionRate = 0;
  if (retentions.length > 0 && retentions[0]?.has_sufficient_data) {
    const latest = retentions[0];
    if (latest.cohort_size > 0) {
      activeRetentionRate = Math.round((latest.day_7_retained / latest.cohort_size) * 100);
    }
  }

  const confirmedChurn = churns.length;
  const openSupport = supportTickets.length;

  const summaryMetrics = {
    total_opportunities: opportunities.length,
    total_experiments: experiments.length,
    total_products: products.length,
    total_campaigns: campaigns.length,
    total_orders_count: orders.length,
    total_refunds_count: refunds.length,
  };

  const snapshot = await createBusinessSnapshot({
    snapshot_date: snapshotDate,
    active_opportunities_count: activeOpportunities,
    active_experiments_count: activeExperiments,
    active_products_count: activeProducts,
    active_campaigns_count: activeCampaigns,
    total_visitors_count: totalVisitors,
    total_leads_count: totalLeads,
    total_signups_count: totalSignups,
    total_customers_count: paidCustomers,
    activated_customers_count: activatedCustomers,
    total_revenue_inr: totalRevenue,
    total_refunds_inr: totalRefunds,
    net_revenue_inr: netRevenue,
    active_retention_rate_percent: activeRetentionRate,
    confirmed_churn_count: confirmedChurn,
    open_support_tickets_count: openSupport,
    summary_metrics: summaryMetrics,
    is_demo: isDemo,
  });

  await createAuditLog({
    event_type: "BUSINESS_SNAPSHOT_CREATED",
    entity_type: "business_snapshot",
    entity_id: snapshot.id,
    actor: "intelligence_engine",
    details: {
      snapshot_date: snapshotDate,
      active_products: activeProducts,
      total_revenue_inr: totalRevenue,
      net_revenue_inr: netRevenue,
      is_demo: isDemo,
    },
  });

  return snapshot;
}

export const businessSnapshotAggregator = {
  captureSnapshot: async (isDemo: boolean = false) => {
    const snapshot = await generateBusinessSnapshot({ is_demo: isDemo });
    return {
      snapshot,
      metrics_count: Object.keys(snapshot.summary_metrics || {}).length,
      timestamp: snapshot.created_at,
    };
  },
};
