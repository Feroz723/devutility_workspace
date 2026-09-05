import { NextRequest, NextResponse } from "next/server";
import { executeCustomerIntervention } from "@/customer-success/interventions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interventionId = params.id;
    const result = await executeCustomerIntervention(interventionId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
