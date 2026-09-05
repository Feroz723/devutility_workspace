import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaign_id") ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    const attributions = await distributionRepo.listAttributions({
      campaign_id: campaignId,
      is_demo: isDemo,
    });

    // Grouping summary by source
    const sourceBreakdown: Record<string, { visits: number; clicks: number; signups: number; conversions: number }> = {};

    for (const a of attributions) {
      const src = a.utm_source || "direct";
      if (!sourceBreakdown[src]) {
        sourceBreakdown[src] = { visits: 0, clicks: 0, signups: 0, conversions: 0 };
      }
      sourceBreakdown[src].visits += a.visits_count;
      sourceBreakdown[src].clicks += a.clicks_count;
      sourceBreakdown[src].signups += a.signups_count;
      sourceBreakdown[src].conversions += a.conversions_count;
    }

    return NextResponse.json({
      total: attributions.length,
      source_breakdown: sourceBreakdown,
      attributions: attributions.slice(0, 100),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
