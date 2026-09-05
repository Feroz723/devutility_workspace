import {
  upsertChannelPerformance,
  listChannelPerformance,
} from "@/database/repositories/intelligence-repo";

import {
  listAttributions,
  listDistributionMetrics,
} from "@/database/repositories/distribution-repo";
import { listSalesAttributions } from "@/database/repositories/sales-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { ChannelPerformance, ChannelPerformanceTier } from "@/types/intelligence";

export async function evaluateChannelPerformance(
  channelType: string,
  campaignId?: string | null,
  isDemo?: boolean
): Promise<ChannelPerformance> {
  const [leads, salesAttributions, distMetricsRes] = await Promise.all([
    listAttributions({ is_demo: isDemo }).catch(() => []),
    listSalesAttributions({ limit: 1000 }).catch(() => []),
    listDistributionMetrics({ is_demo: isDemo }).catch(() => ({ metrics: [], total: 0 })),
  ]);

  const distMetrics = distMetricsRes.metrics || [];
  const channelLeads = leads.filter((l) => l.utm_source === channelType || l.channel_id === channelType);
  const channelSales = salesAttributions.filter((s) => s.utm_source === channelType || s.channel_id === channelType);

  let traffic = 0;
  for (const m of distMetrics) {
    if (m.channel_id === channelType && (m.metric_name === "CLICKS" || m.metric_name === "PAGE_VIEWS")) {
      traffic += Number(m.metric_value) || 0;
    }
  }

  const qualifiedLeads = channelLeads.length;
  const customersCount = channelSales.length;
  const totalRevenue = channelSales.reduce((sum, s) => sum + (Number(s.revenue_attributed_cents ? s.revenue_attributed_cents / 100 : 0)), 0);

  const conversionRate = traffic > 0 ? Math.round((customersCount / traffic) * 10000) / 100 : 0;
  const effortScore = 5; // Default standard effort

  let tier: ChannelPerformanceTier = "INSUFFICIENT_DATA";
  let notes = "Insufficient traffic or leads to classify channel.";

  if (traffic < 5 && qualifiedLeads === 0) {
    tier = "INSUFFICIENT_DATA";
    notes = "Early testing: insufficient traffic to determine channel efficacy.";
  } else if (customersCount >= 2 && totalRevenue > 0) {
    tier = "SCALE";
    notes = "Verified revenue-generating channel. Priority candidate for expanded outreach.";
  } else if (qualifiedLeads >= 3) {
    tier = "MAINTAIN";
    notes = "Healthy lead generation channel; continue active distribution cadence.";
  } else if (traffic >= 20 && qualifiedLeads === 0) {
    tier = "ITERATE";
    notes = "Channel drives impressions/clicks but low qualified lead conversion; iterate copy or targeting.";
  } else if (traffic >= 50 && customersCount === 0) {
    tier = "PAUSE";
    notes = "High traffic without conversions; pause active automated asset publishing.";
  } else {
    tier = "MAINTAIN";
    notes = "Steady ongoing performance.";
  }

  const performance = await upsertChannelPerformance({
    channel_type: channelType,
    campaign_id: campaignId ?? null,
    performance_tier: tier,
    traffic_count: traffic,
    qualified_leads_count: qualifiedLeads,
    signups_count: qualifiedLeads,
    customers_count: customersCount,
    revenue_inr: totalRevenue,
    conversion_rate_percent: conversionRate,
    effort_score: effortScore,
    cost_inr: 0, // ₹0 organic distribution
    retention_quality_score: 50,
    notes,
    is_demo: isDemo,
  });

  await createAuditLog({
    event_type: "CHANNEL_EVALUATED",
    entity_type: "channel_performance",
    entity_id: performance.id,
    actor: "intelligence_engine",
    details: {
      channel_type: channelType,
      performance_tier: tier,
      customers_count: customersCount,
      revenue_inr: totalRevenue,
    },
  });

  return performance;
}

export const channelPerformanceEvaluator = {
  evaluateChannel: async (channelType: string, campaignId?: string | null, isDemo: boolean = false) =>
    evaluateChannelPerformance(channelType, campaignId, isDemo),
};
