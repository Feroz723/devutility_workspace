import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { productRepo } from "@/database/repositories/product-repo";
import { prepareCampaignAssets } from "@/distribution/assets";

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

    const product = await productRepo.findById(campaign.product_id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const strategy = campaign.strategy_id
      ? await distributionRepo.getStrategy(campaign.strategy_id)
      : null;

    const hostHeader = request.headers.get("host") || "localhost:3000";
    const protocol = hostHeader.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${hostHeader}`;

    const result = await prepareCampaignAssets({
      campaign,
      product,
      strategy,
      baseUrl,
    });

    return NextResponse.json({
      success: true,
      assets_created: result.assets.length,
      queue_items_created: result.queueItems.length,
      warnings: result.warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
