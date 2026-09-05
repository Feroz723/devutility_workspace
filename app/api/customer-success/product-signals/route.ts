import { NextRequest, NextResponse } from "next/server";
import { detectProductLearningSignals } from "@/customer-success/product-signals";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get("product_id");
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    const signals = await detectProductLearningSignals(product_id, is_demo);
    return NextResponse.json(signals);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
