import { NextRequest, NextResponse } from "next/server";
import { getCustomerEntitlements } from "@/database/repositories/sales-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customer_id") ?? undefined;
    const productId = url.searchParams.get("product_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const includeDemo = url.searchParams.get("include_demo") === "true";

    const entitlements = await getCustomerEntitlements({ customerId, productId, status, includeDemo });
    return NextResponse.json({ entitlements, total: entitlements.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
