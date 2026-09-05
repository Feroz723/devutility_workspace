import { NextRequest, NextResponse } from "next/server";
import { clusterFeatureRequests } from "@/customer-success/feature-requests";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get("product_id") || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;

    const clusters = await clusterFeatureRequests({ product_id, is_demo });
    return NextResponse.json(clusters);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
