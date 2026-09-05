import { NextRequest, NextResponse } from "next/server";
import { cancelCustomerIntervention } from "@/customer-success/interventions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interventionId = params.id;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Cancelled by operator";

    const updated = await cancelCustomerIntervention(interventionId, reason);
    if (!updated) {
      return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
