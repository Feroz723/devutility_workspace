import { NextRequest, NextResponse } from "next/server";
import { portfolioRankingEngine } from "@/intelligence/portfolio";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    const ranking = await portfolioRankingEngine.rankPortfolio(isDemo);

    return NextResponse.json({
      portfolio: ranking,
      total_items: ranking.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
