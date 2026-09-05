import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { logAudit } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await distributionRepo.updateCampaign(params.id, {
      status: "STOPPED",
    });
    if (!updated) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Cancel remaining pending/ready items
    const { items: queueItems } = await distributionRepo.listQueueItems({
      campaign_id: params.id,
    });

    for (const item of queueItems) {
      if (item.status === "READY_FOR_REVIEW" || item.status === "APPROVED" || item.status === "SCHEDULED") {
        await distributionRepo.updateQueueItem(item.id, { status: "CANCELLED" });
      }
    }

    await logAudit({
      entity_type: "distribution_campaign",
      entity_id: params.id,
      action: "DISTRIBUTION_CAMPAIGN_STOPPED",
      details: { stopped_at: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
