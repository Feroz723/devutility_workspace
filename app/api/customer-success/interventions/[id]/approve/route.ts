import { NextRequest, NextResponse } from "next/server";
import { approveCustomerIntervention } from "@/customer-success/interventions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interventionId = params.id;
    const body = await req.json().catch(() => ({}));
    const approvedBy = body.approved_by || "operator";

    const updated = await approveCustomerIntervention(interventionId, approvedBy);
    if (!updated) {
      return NextResponse.json(
        { error: "Intervention not found or already processed" },
        { status: 400 }
      );
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
