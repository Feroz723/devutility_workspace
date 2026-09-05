import { distributionRepo } from "@/database/repositories/distribution-repo";
import { parseUtmParams, generateTrackingToken } from "./attribution";
import type {
  DistributionMetric,
  DistributionLead,
  DistributionAttribution,
  MetricSource,
  ChannelType,
} from "@/types/distribution";

export interface RecordMetricInput {
  campaign_id: string;
  channel_type: ChannelType;
  channel_id?: string | null;
  metric_name: string;
  metric_value: number;
  source: MetricSource;
  confidence?: number;
  raw_payload?: Record<string, unknown>;
  is_demo?: boolean;
}

export interface RecordLeadInput {
  campaign_id: string;
  channel_type?: ChannelType | null;
  channel_id?: string | null;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  source: string;
  qualification_score?: number;
  notes?: string | null;
  is_demo?: boolean;
}

export interface IngestUtmHitInput {
  url: string;
  referrer?: string | null;
  user_agent?: string | null;
  ip_hash?: string | null;
  is_demo?: boolean;
}

export interface AggregatedMetrics {
  impressions: number;
  clicks: number;
  visitors: number;
  signups: number;
  leads: number;
  cost_inr: number;
  ctr: number; // percentage
  signup_conversion_rate: number; // percentage
  lead_conversion_rate: number; // percentage
}

/**
 * Ingest and record a distribution metric event.
 */
export async function recordMetric(input: RecordMetricInput): Promise<DistributionMetric> {
  let targetChannelId = input.channel_id;
  if (!targetChannelId) {
    const ch = await distributionRepo.getChannelByType(input.channel_type);
    targetChannelId = ch ? ch.id : "00000000-0000-0000-0000-000000000000";
  }

  return await distributionRepo.createMetric({
    campaign_id: input.campaign_id,
    channel_id: targetChannelId,
    metric_name: input.metric_name,
    metric_value: input.metric_value,
    source: input.source,
    confidence: input.confidence ?? 100,
    raw_payload: input.raw_payload ?? {},
    is_demo: input.is_demo ?? false,
  });
}

/**
 * Ingest and record a captured lead.
 */
export async function recordLead(input: RecordLeadInput): Promise<DistributionLead> {
  return await distributionRepo.createLead({
    campaign_id: input.campaign_id,
    channel_id: input.channel_id ?? null,
    name: input.name ?? null,
    email: input.email ?? null,
    company: input.company ?? null,
    source: input.source,
    qualification_score: input.qualification_score ?? 50,
    notes: input.notes ?? null,
    is_demo: input.is_demo ?? false,
  });
}

/**
 * Track an inbound visitor hit with UTM parameters.
 */
export async function trackUtmHit(input: IngestUtmHitInput): Promise<DistributionAttribution | null> {
  const parsed = parseUtmParams(input.url);
  if (!parsed.campaign && !parsed.source && !parsed.medium) {
    return null;
  }

  return await distributionRepo.createAttribution({
    tracking_token: generateTrackingToken(),
    campaign_id: parsed.campaign || undefined,
    utm_source: parsed.source || undefined,
    utm_medium: parsed.medium || undefined,
    utm_campaign: parsed.campaign || undefined,
    utm_content: parsed.content || undefined,
    utm_term: parsed.term || undefined,
    is_demo: input.is_demo ?? false,
  });
}

/**
 * Aggregates recorded metrics for a specific channel or campaign.
 */
export async function aggregateChannelMetrics(
  campaignId: string,
  channelType?: ChannelType,
  isDemo = false
): Promise<AggregatedMetrics> {
  const channel = channelType ? await distributionRepo.getChannelByType(channelType) : null;

  const { metrics } = await distributionRepo.listMetrics({
    campaign_id: campaignId,
    channel_id: channel?.id,
    is_demo: isDemo,
  });

  let impressions = 0;
  let clicks = 0;
  let visitors = 0;
  let signups = 0;
  let leads = 0;
  let cost_inr = 0;

  for (const m of metrics) {
    const name = m.metric_name.toLowerCase();
    const val = Number(m.metric_value) || 0;

    if (name.includes("impression") || name.includes("view")) {
      impressions += val;
    } else if (name.includes("click")) {
      clicks += val;
    } else if (name.includes("visitor") || name.includes("visit")) {
      visitors += val;
    } else if (name.includes("signup") || name.includes("subscriber")) {
      signups += val;
    } else if (name.includes("lead")) {
      leads += val;
    } else if (name.includes("cost") || name.includes("spend")) {
      cost_inr += val;
    }
  }

  // Also count real captured leads if no explicit metric is provided
  if (leads === 0) {
    const { leads: capturedLeads } = await distributionRepo.listLeads({
      campaign_id: campaignId,
      channel_id: channel?.id,
      is_demo: isDemo,
    });
    leads = capturedLeads.length;
  }

  // Also calculate visitors from attribution if visits metric is zero
  if (visitors === 0) {
    const attributions = await distributionRepo.listAttributions({
      campaign_id: campaignId,
      is_demo: isDemo,
    });
    visitors = attributions.length;
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const signup_conversion_rate = visitors > 0 ? (signups / visitors) * 100 : 0;
  const lead_conversion_rate = visitors > 0 ? (leads / visitors) * 100 : 0;

  return {
    impressions,
    clicks,
    visitors,
    signups,
    leads,
    cost_inr,
    ctr: Math.round(ctr * 100) / 100,
    signup_conversion_rate: Math.round(signup_conversion_rate * 100) / 100,
    lead_conversion_rate: Math.round(lead_conversion_rate * 100) / 100,
  };
}
