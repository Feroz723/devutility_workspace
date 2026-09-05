import { NextRequest, NextResponse } from "next/server";
import { getActivationMetrics } from "@/customer-success/activation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get("product_id") || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;

    const summary = await getActivationMetrics({ product_id, is_demo });
    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
