import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { recordLead } from "@/distribution/metrics";
import { logAudit } from "@/database/repositories/audit-repo";
import type { ChannelType } from "@/types/distribution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaign_id") ?? undefined;
    const channelId = url.searchParams.get("channel_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    const { leads, total } = await distributionRepo.listLeads({
      campaign_id: campaignId,
      channel_id: channelId,
      status,
      is_demo: isDemo,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });

    return NextResponse.json({ leads, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json?.campaign_id || (!json?.email && !json?.name)) {
      return NextResponse.json(
        { error: "campaign_id and at least email or name are required." },
        { status: 400 }
      );
    }

    const lead = await recordLead({
      campaign_id: json.campaign_id,
      channel_type: (json.channel_type as ChannelType) || null,
      channel_id: json.channel_id ?? null,
      name: json.name ?? null,
      email: json.email ?? null,
      company: json.company ?? null,
      source: json.source || "organic",
      qualification_score: json.qualification_score ?? 50,
      notes: json.notes ?? null,
      is_demo: json.is_demo ?? false,
    });

    await logAudit({
      entity_type: "distribution_lead",
      entity_id: lead.id,
      action: "LEAD_CAPTURED",
      details: {
        campaign_id: lead.campaign_id,
        source: lead.source,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
