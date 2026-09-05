import { NextRequest, NextResponse } from "next/server";
import { CreateDistributionAssetSchema } from "@/types/distribution";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { logAudit } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaign_id") ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    const assets = await distributionRepo.listAssets({
      campaign_id: campaignId,
      is_demo: isDemo,
    });

    return NextResponse.json({ assets, total: assets.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateDistributionAssetSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const asset = await distributionRepo.createAsset(parsed.data);

    await logAudit({
      entity_type: "distribution_asset",
      entity_id: asset.id,
      action: "DISTRIBUTION_ASSET_CREATED",
      details: {
        title: asset.title,
        channel_type: asset.channel_type,
        content_type: asset.content_type,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
