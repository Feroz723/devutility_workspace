import { NextRequest, NextResponse } from "next/server";
import { listCustomerInterventions } from "@/database/repositories/customer-success-repo";
import { proposeIntervention } from "@/customer-success/interventions";
import type { InterventionStatus } from "@/types/customer-success";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id") || undefined;
    const status = (searchParams.get("status") as InterventionStatus) || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const list = await listCustomerInterventions({ customer_id, status, is_demo, limit });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customer_id || !body.intervention_type || !body.reason || !body.recommended_action) {
      return NextResponse.json(
        { error: "customer_id, intervention_type, reason, and recommended_action are required" },
        { status: 400 }
      );
    }

    const item = await proposeIntervention(body);
    return NextResponse.json(item);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
