import { NextRequest, NextResponse } from "next/server";
import { approvalAggregator } from "@/operations/approval-aggregator";

export async function GET(req: NextRequest) {
  try {
    const approvals = await approvalAggregator.getPendingApprovals();
    return NextResponse.json({ approvals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
