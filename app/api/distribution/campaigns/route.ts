import { NextRequest, NextResponse } from "next/server";
import { CreateDistributionCampaignSchema } from "@/types/distribution";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { verifyZeroCostDistribution } from "@/distribution/guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("product_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    // Seed channels if not yet seeded
    await distributionRepo.seedInitialChannelsIfEmpty();

    const { campaigns, total } = await distributionRepo.listCampaigns({
      product_id: productId,
      status,
      is_demo: isDemo,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });

    return NextResponse.json({ campaigns, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateDistributionCampaignSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Pre-flight zero cost check
    const zeroCostCheck = verifyZeroCostDistribution([], [parsed.data.name], parsed.data.budget_inr || 0);
    if (!zeroCostCheck.compliant) {
      return NextResponse.json(
        {
          error: "Zero-cost policy violation: proposed campaign budget must be ₹0 for autonomous execution.",
          flaggedItems: zeroCostCheck.flaggedItems,
        },
        { status: 400 }
      );
    }

    const campaign = await distributionRepo.createCampaign(parsed.data);

    await logAudit({
      entity_type: "distribution_campaign",
      entity_id: campaign.id,
      action: "DISTRIBUTION_CAMPAIGN_CREATED",
      details: {
        name: campaign.name,
        product_id: campaign.product_id,
        budget_inr: campaign.budget_inr,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
