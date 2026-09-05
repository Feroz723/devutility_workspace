import { NextRequest, NextResponse } from "next/server";
import { distributionDecisionEngine } from "@/intelligence/distribution-decisions";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    const [decisions, performances] = await Promise.all([
      distributionDecisionEngine.evaluateChannels(isDemo),
      intelligenceRepo.listChannelPerformances({ is_demo: isDemo }),
    ]);

    return NextResponse.json({
      channels: decisions,
      performances,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
