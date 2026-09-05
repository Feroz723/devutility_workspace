import { NextRequest, NextResponse } from "next/server";
import { runCustomerSuccessPipeline } from "@/customer-success/runner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runCustomerSuccessPipeline({
      is_demo: body.is_demo ?? false,
      product_id: body.product_id,
      max_customers: body.max_customers ?? 50,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
