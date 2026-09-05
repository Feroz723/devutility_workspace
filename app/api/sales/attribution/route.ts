import { NextRequest, NextResponse } from "next/server";
import { SalesAttributionEngine } from "@/sales/attribution";
import { listSalesAttributions } from "@/database/repositories/sales-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("order_id") ?? undefined;
    const campaignId = url.searchParams.get("campaign_id") ?? undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;

    const attributions = await listSalesAttributions({ orderId, campaignId, limit });
    const sourceBreakdown = await SalesAttributionEngine.getSourceBreakdown();

    return NextResponse.json({ attributions, sourceBreakdown });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
