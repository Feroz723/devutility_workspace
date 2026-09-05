import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import type { QueueStatus } from "@/types/distribution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaign_id") ?? undefined;
    const channelId = url.searchParams.get("channel_id") ?? undefined;
    const status = (url.searchParams.get("status") as QueueStatus) ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    const { items, total } = await distributionRepo.listQueueItems({
      campaign_id: campaignId,
      channel_id: channelId,
      status,
      is_demo: isDemo,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });

    return NextResponse.json({ items, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
