import { NextRequest, NextResponse } from "next/server";
import { listDeliveries } from "@/database/repositories/sales-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("order_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const includeDemo = url.searchParams.get("include_demo") === "true";
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const deliveries = await listDeliveries({ orderId, status, includeDemo, limit, offset });
    return NextResponse.json({ deliveries, total: deliveries.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
