import { NextRequest, NextResponse } from "next/server";
import { manualActionAggregator } from "@/operations/manual-action-aggregator";

export async function GET(req: NextRequest) {
  try {
    const actions = await manualActionAggregator.getManualActions();
    return NextResponse.json({ actions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
