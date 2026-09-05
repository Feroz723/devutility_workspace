import { NextRequest, NextResponse } from "next/server";
import { listCustomerChurn } from "@/database/repositories/customer-success-repo";
import { detectCustomerChurn } from "@/customer-success/churn";
import type { ChurnStatus } from "@/types/customer-success";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const churn_status = (searchParams.get("churn_status") as ChurnStatus) || undefined;
    const product_id = searchParams.get("product_id") || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;

    const list = await listCustomerChurn({ churn_status, product_id, is_demo, limit });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customer_id) {
      return NextResponse.json({ error: "customer_id is required" }, { status: 400 });
    }

    const result = await detectCustomerChurn(body.customer_id, body.product_id, body.is_demo);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
