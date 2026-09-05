import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { logAudit } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await distributionRepo.getCampaign(params.id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const updated = await distributionRepo.updateCampaign(params.id, {
      status: "APPROVED",
    });

    // Also approve ready queue items for this campaign
    const { items: queueItems } = await distributionRepo.listQueueItems({
      campaign_id: params.id,
      status: "READY_FOR_REVIEW",
    });

    for (const item of queueItems) {
      await distributionRepo.updateQueueItem(item.id, { status: "APPROVED" });
    }

    await logAudit({
      entity_type: "distribution_campaign",
      entity_id: params.id,
      action: "DISTRIBUTION_CAMPAIGN_APPROVED",
      details: { previous_status: campaign.status },
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
