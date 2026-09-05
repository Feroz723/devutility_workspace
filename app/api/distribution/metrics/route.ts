import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { recordMetric } from "@/distribution/metrics";
import type { ChannelType, MetricSource } from "@/types/distribution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaign_id") ?? undefined;
    const channelId = url.searchParams.get("channel_id") ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    const { metrics, total } = await distributionRepo.listMetrics({
      campaign_id: campaignId,
      channel_id: channelId,
      is_demo: isDemo,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });

    return NextResponse.json({ metrics, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json?.campaign_id || !json?.metric_name || json?.metric_value === undefined) {
      return NextResponse.json(
        { error: "campaign_id, metric_name, and metric_value are required." },
        { status: 400 }
      );
    }

    const metric = await recordMetric({
      campaign_id: json.campaign_id,
      channel_type: (json.channel_type as ChannelType) || "OWNED_WEBSITE",
      channel_id: json.channel_id ?? null,
      metric_name: json.metric_name,
      metric_value: Number(json.metric_value),
      source: (json.source as MetricSource) || "MANUAL",
      confidence: json.confidence ?? 100,
      raw_payload: json.raw_payload ?? {},
      is_demo: json.is_demo ?? false,
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
