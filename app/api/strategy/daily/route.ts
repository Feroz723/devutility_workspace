import { NextRequest, NextResponse } from "next/server";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import { dailyBriefGenerator } from "@/strategy/daily-brief-generator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    let brief = await strategyRepo.getLatestDailyBrief(isDemo);
    if (!brief) {
      brief = await dailyBriefGenerator.generateBrief({ isDemo });
    }

    return NextResponse.json({ success: true, brief });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch daily strategic brief" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;

    const brief = await dailyBriefGenerator.generateBrief({ isDemo });
    return NextResponse.json({ success: true, brief });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate daily strategic brief" }, { status: 500 });
  }
}
