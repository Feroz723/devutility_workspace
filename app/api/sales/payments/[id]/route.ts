import { NextRequest, NextResponse } from "next/server";
import { getPaymentById } from "@/database/repositories/sales-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payment = await getPaymentById(params.id);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    return NextResponse.json({ payment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
