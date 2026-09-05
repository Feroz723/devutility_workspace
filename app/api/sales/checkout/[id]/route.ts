import { NextRequest, NextResponse } from "next/server";
import { CheckoutEngine } from "@/sales/checkout";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await CheckoutEngine.getSession(params.id);
    if (!session) {
      return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
