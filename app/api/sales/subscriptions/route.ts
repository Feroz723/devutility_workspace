import { NextRequest, NextResponse } from "next/server";
import { listSubscriptions } from "@/database/repositories/sales-repo";
import { SubscriptionManager } from "@/sales/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customer_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const includeDemo = url.searchParams.get("include_demo") === "true";
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const subscriptions = await listSubscriptions({ customerId, status, includeDemo, limit, offset });
    return NextResponse.json({ subscriptions, total: subscriptions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
