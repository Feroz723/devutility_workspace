import { NextRequest, NextResponse } from "next/server";
import { listCustomerGoals } from "@/database/repositories/customer-success-repo";
import { setupCustomerGoal, completeMilestone } from "@/customer-success/goals";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id") || undefined;
    const product_id = searchParams.get("product_id") || undefined;

    const goals = await listCustomerGoals({ customer_id, product_id });
    return NextResponse.json(goals);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "complete_milestone") {
      if (!body.milestone_id) {
        return NextResponse.json({ error: "milestone_id is required" }, { status: 400 });
      }
      const result = await completeMilestone(body.milestone_id, body.evidence);
      return NextResponse.json(result);
    }

    if (!body.customer_id || !body.product_id || !body.title) {
      return NextResponse.json(
        { error: "customer_id, product_id, and title are required" },
        { status: 400 }
      );
    }

    const result = await setupCustomerGoal(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
