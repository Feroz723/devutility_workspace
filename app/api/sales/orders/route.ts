import { NextRequest, NextResponse } from "next/server";
import { listOrders } from "@/database/repositories/sales-repo";
import { OrderManager } from "@/sales/order";
import { DeliveryEngine } from "@/sales/delivery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customer_id") ?? undefined;
    const offerId = url.searchParams.get("offer_id") ?? undefined;
    const productId = url.searchParams.get("product_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const includeDemo = url.searchParams.get("include_demo") === "true";
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const orders = await listOrders({ customerId, offerId, productId, status, includeDemo, limit, offset });
    return NextResponse.json({ orders, total: orders.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json?.offer_id || !json?.customer_id) {
      return NextResponse.json({ error: "offer_id and customer_id are required" }, { status: 400 });
    }

    const { order, payment } = await OrderManager.createOrderFromCheckout({
      sessionId: json.session_id,
      offerId: json.offer_id,
      customerId: json.customer_id,
      customerEmail: json.customer_email,
      customerName: json.customer_name,
      providerPaymentId: json.provider_payment_id,
      providerOrderId: json.provider_order_id,
      provider: json.provider ?? "MANUAL",
      amountCents: json.amount_cents ?? 0,
      currency: json.currency ?? "INR",
      isFree: json.is_free,
      attribution: json.attribution,
      metadata: json.metadata,
      isDemo: json.is_demo,
    });

    // If order is paid or free, trigger fulfillment immediately
    let delivery = null;
    if (order.status === "PAID") {
      delivery = await DeliveryEngine.fulfillOrder(order.id).catch(() => null);
    }

    return NextResponse.json({ order, payment, delivery }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
