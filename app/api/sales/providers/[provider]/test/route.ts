import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/sales/providers";
import { PaymentProvider } from "@/types/sales";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const rawProvider = params.provider.toUpperCase() as PaymentProvider;
    const adapter = getPaymentProvider(rawProvider);
    const status = await adapter.testConnection();

    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
