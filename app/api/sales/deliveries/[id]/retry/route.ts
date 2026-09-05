import { NextRequest, NextResponse } from "next/server";
import { getDeliveryById } from "@/database/repositories/sales-repo";
import { DeliveryEngine } from "@/sales/delivery";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const delivery = await getDeliveryById(params.id);
    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    const result = await DeliveryEngine.fulfillOrder(delivery.order_id);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
