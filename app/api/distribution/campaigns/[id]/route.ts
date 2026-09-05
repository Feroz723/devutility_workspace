import { NextRequest, NextResponse } from "next/server";
import { UpdateDistributionCampaignSchema } from "@/types/distribution";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { productRepo } from "@/database/repositories/product-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { aggregateChannelMetrics } from "@/distribution/metrics";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await distributionRepo.getCampaign(params.id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const product = await productRepo.findById(campaign.product_id);
    const strategy = campaign.strategy_id
      ? await distributionRepo.getStrategy(campaign.strategy_id)
      : null;

    const { items: queueItems } = await distributionRepo.listQueueItems({
      campaign_id: campaign.id,
    });

    const assets = await distributionRepo.listAssets({
      campaign_id: campaign.id,
      is_demo: campaign.is_demo,
    });

    const metrics = await aggregateChannelMetrics(campaign.id, undefined, campaign.is_demo);

    return NextResponse.json({
      campaign,
      product,
      strategy,
      assets_count: assets.length,
      queue_summary: {
        total: queueItems.length,
        ready_for_review: queueItems.filter((q) => q.status === "READY_FOR_REVIEW").length,
        approved: queueItems.filter((q) => q.status === "APPROVED").length,
        published: queueItems.filter((q) => q.status === "PUBLISHED").length,
        requires_manual_action: queueItems.filter((q) => q.status === "REQUIRES_MANUAL_ACTION").length,
        failed: queueItems.filter((q) => q.status === "FAILED").length,
      },
      metrics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = UpdateDistributionCampaignSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await distributionRepo.updateCampaign(params.id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await logAudit({
      entity_type: "distribution_campaign",
      entity_id: params.id,
      action: "DISTRIBUTION_CAMPAIGN_UPDATED",
      details: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
