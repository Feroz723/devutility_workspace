import { NextRequest, NextResponse } from "next/server";
import { autonomousCycleOrchestrator } from "@/operations/cycle-orchestrator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cycleType = body.cycle_type === "WEEKLY" ? "WEEKLY" : "DAILY";
    const isDemo = Boolean(body.is_demo);

    const result = await autonomousCycleOrchestrator.runCycle(cycleType, isDemo);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
