import { NextRequest, NextResponse } from "next/server";
import { strategyEngine } from "@/strategy/strategy-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;
    const reason = body.reason || "On-demand strategic intelligence evaluation";

    const result = await strategyEngine.evaluateStrategy({
      isDemo,
      reason,
      forceReassessment: body.force === true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to execute strategic evaluation" }, { status: 500 });
  }
}
