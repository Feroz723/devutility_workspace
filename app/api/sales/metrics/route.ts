import { NextRequest, NextResponse } from "next/server";
import { SalesAnalyticsEngine } from "@/sales/analysis";
import { SalesOptimizationEngine } from "@/sales/optimization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeDemo = url.searchParams.get("include_demo") === "true";

    const summary = await SalesAnalyticsEngine.generateSalesSummary({ includeDemo });
    const recommendations = await SalesOptimizationEngine.evaluateOffers().catch(() => []);

    return NextResponse.json({ summary, recommendations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
