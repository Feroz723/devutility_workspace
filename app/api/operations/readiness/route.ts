import { NextRequest, NextResponse } from "next/server";
import { systemReadinessEngine } from "@/operations/readiness-engine";

export async function GET(req: NextRequest) {
  try {
    const evaluation = await systemReadinessEngine.evaluateReadiness();
    return NextResponse.json(evaluation);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
