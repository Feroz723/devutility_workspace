import { NextRequest, NextResponse } from "next/server";
import { listCustomerRetention } from "@/database/repositories/customer-success-repo";
import { calculateCohortRetention } from "@/customer-success/retention";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get("product_id") || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 30;

    const retention = await listCustomerRetention({ product_id, is_demo, limit });
    return NextResponse.json(retention);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cohortDate = body.cohort_date || new Date().toISOString().split("T")[0];
    const result = await calculateCohortRetention(cohortDate, body.product_id, body.is_demo);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
