import { NextRequest, NextResponse } from "next/server";
import { autonomousIntelligenceRunner } from "@/intelligence/runner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;

    const result = await autonomousIntelligenceRunner.runIntelligenceCycle(isDemo);

    return NextResponse.json({
      success: result.status === "COMPLETED",
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
