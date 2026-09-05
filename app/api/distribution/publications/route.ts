import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaign_id") ?? undefined;
    const channelId = url.searchParams.get("channel_id") ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    const { publications, total } = await distributionRepo.listPublications({
      campaign_id: campaignId,
      channel_id: channelId,
      is_demo: isDemo,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });

    return NextResponse.json({ publications, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
