import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { analyzeCampaign } from "@/distribution/analysis";
import { optimizeCampaignStrategy } from "@/distribution/optimization";

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

    const report = await analyzeCampaign(params.id, campaign.is_demo);
    const optimization = await optimizeCampaignStrategy(params.id, campaign.is_demo);

    return NextResponse.json({
      analysis: report,
      optimization,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
