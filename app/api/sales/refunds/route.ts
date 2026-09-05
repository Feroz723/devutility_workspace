import { NextRequest, NextResponse } from "next/server";
import { listRefunds } from "@/database/repositories/sales-repo";
import { RefundManager } from "@/sales/refunds";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("order_id") ?? undefined;
    const customerId = url.searchParams.get("customer_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const includeDemo = url.searchParams.get("include_demo") === "true";
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const refunds = await listRefunds({ orderId, customerId, status, includeDemo, limit, offset });
    return NextResponse.json({ refunds, total: refunds.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json?.order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    const refund = await RefundManager.processRefund({
      orderId: json.order_id,
      reason: json.reason,
      amountCents: json.amount_cents !== undefined ? Number(json.amount_cents) : undefined,
    });

    return NextResponse.json({ success: true, refund }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
