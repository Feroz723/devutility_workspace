import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerOutcome, getProductOutcomeSummary } from "@/customer-success/outcomes";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get("product_id");
    const customer_id = searchParams.get("customer_id");

    if (customer_id && product_id) {
      const outcome = await verifyCustomerOutcome(customer_id, product_id);
      return NextResponse.json(outcome);
    }

    if (product_id) {
      const summary = await getProductOutcomeSummary(product_id);
      return NextResponse.json(summary);
    }

    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
