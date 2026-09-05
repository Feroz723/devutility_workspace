import { NextRequest, NextResponse } from "next/server";
import {
  getOrderById,
  getOrderItems,
  getPaymentByOrderId,
  getDeliveryByOrderId,
} from "@/database/repositories/sales-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = await getOrderItems(order.id);
    const payment = await getPaymentByOrderId(order.id);
    const delivery = await getDeliveryByOrderId(order.id);

    return NextResponse.json({ order, items, payment, delivery });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
