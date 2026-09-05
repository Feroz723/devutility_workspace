import { NextRequest, NextResponse } from "next/server";
import { approvalAggregator } from "@/operations/approval-aggregator";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const operator = body.operator || "operator";

    await approvalAggregator.approveAction(params.id, operator);
    return NextResponse.json({ success: true, message: `Approved action ${params.id}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
