import { NextRequest, NextResponse } from "next/server";
import { getCustomerById, getCustomerEntitlements, listOrders } from "@/database/repositories/sales-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getCustomerById(params.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const entitlements = await getCustomerEntitlements({ customerId: customer.id });
    const orders = await listOrders({ customerId: customer.id });

    return NextResponse.json({ customer, entitlements, orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
